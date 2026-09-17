"use client";

import { useQuery } from "@tanstack/react-query";
import { Megaphone, Tag, X } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Role, type LeadStatus } from "@lms/types";
import type { LeadFilters } from "@/hooks/useLeads";
import { SearchByField, type SearchField } from "@/components/filters/SearchByField";
import { StatusMultiSelect } from "@/components/filters/StatusMultiSelect";
import { AssigneeMultiSelect } from "@/components/filters/AssigneeMultiSelect";
import { DatePresetSelect } from "@/components/filters/DatePresetSelect";
import { FilterChip, PopoverFooter } from "@/components/filters/FilterChip";
import { cn } from "@/lib/utils";

type Props = {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  onReset: () => void;
};

// ─────────────────────────────────────────────────────────────────────────
// TeleCRM-style filter bar: search-by-field, then chips — Status (grouped
// multi-select), Assignee (multi-select, managers), Created (presets),
// Source, Campaign. Every value round-trips through the URL-backed
// LeadFilters object, so nothing here holds its own state.
// ─────────────────────────────────────────────────────────────────────────
export function LeadFilters({ filters, onChange, onReset }: Props) {
  const { user } = useAuthStore();
  const isManager = user?.role === Role.ADMIN || user?.role === Role.SUB_ADMIN;

  const { data: sources = [] } = useQuery({
    queryKey: ["lead-sources"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Array<{ id: string; name: string }> }>("/settings/sources");
      return data.data;
    },
    staleTime: 60_000,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaign-options"],
    queryFn: async () => {
      const { data } = await api.get<{ data: { campaigns: Array<{ id: string; name: string; isArchived: boolean }> } }>(
        "/campaigns?status=all&pageSize=80&sortBy=name&sortOrder=asc",
      );
      return data.data.campaigns;
    },
    staleTime: 60_000,
  });

  // Multi-selects travel as comma-separated strings in the URL/API.
  const statuses = (filters.statuses ? filters.statuses.split(",") : filters.status ? [filters.status] : []).filter(Boolean) as LeadStatus[];
  const assignees = (filters.assignedToIds ? filters.assignedToIds.split(",") : filters.assignedToId ? [filters.assignedToId] : []).filter(Boolean);

  const patch = (p: Partial<LeadFilters>, drop: Array<keyof LeadFilters> = []) => {
    const next: LeadFilters = { ...filters, ...p, page: 1 };
    for (const k of drop) delete next[k];
    onChange(next);
  };

  const activeCount =
    (filters.search ? 1 : 0) +
    (statuses.length ? 1 : 0) +
    (assignees.length ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    (filters.sourceId ? 1 : 0) +
    (filters.campaignId ? 1 : 0);

  const sourceName = sources.find((s) => s.id === filters.sourceId)?.name;
  const campaignName = filters.campaignId === "none" ? "No campaign" : campaigns.find((c) => c.id === filters.campaignId)?.name;

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-3 space-y-2.5">
      <SearchByField
        value={filters.search ?? ""}
        field={(filters.searchField as SearchField) ?? "all"}
        onChange={({ search, field }) =>
          patch({ ...(search ? { search } : {}), searchField: field }, search ? [] : ["search"])
        }
        placeholder="Search for a lead's name, phone or other details"
        className="w-full"
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusMultiSelect
          value={statuses}
          onChange={(next) => patch(next.length ? { statuses: next.join(",") } : {}, next.length ? ["status"] : ["status", "statuses"])}
        />

        {isManager && (
          <AssigneeMultiSelect
            value={assignees}
            onChange={(next) => patch(next.length ? { assignedToIds: next.join(",") } : {}, next.length ? ["assignedToId"] : ["assignedToId", "assignedToIds"])}
          />
        )}

        <DatePresetSelect
          value={{ dateFrom: filters.dateFrom, dateTo: filters.dateTo }}
          onChange={(r) =>
            patch(
              { ...(r.dateFrom ? { dateFrom: r.dateFrom } : {}), ...(r.dateTo ? { dateTo: r.dateTo } : {}) },
              [...(r.dateFrom ? [] : ["dateFrom" as const]), ...(r.dateTo ? [] : ["dateTo" as const])],
            )
          }
        />

        {sources.length > 0 && (
          <FilterChip icon={Tag} label="Source" value={sourceName ?? "All"} active={!!filters.sourceId} onClear={() => patch({}, ["sourceId"])} width={240}>
            <ul className="max-h-72 overflow-y-auto py-1">
              {sources.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => patch({ sourceId: s.id })}
                    className={cn("w-full text-left px-3 py-1.5 rounded-lg text-sm", filters.sourceId === s.id ? "bg-primary/10 text-primary font-medium" : "text-gray-800 hover:bg-surface-50")}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
            <PopoverFooter count={filters.sourceId ? 1 : 0} onClear={() => patch({}, ["sourceId"])} />
          </FilterChip>
        )}

        {campaigns.length > 0 && (
          <FilterChip icon={Megaphone} label="Campaign" value={campaignName ?? "All"} active={!!filters.campaignId} onClear={() => patch({}, ["campaignId"])} width={280}>
            <ul className="max-h-72 overflow-y-auto py-1">
              <li>
                <button
                  type="button"
                  onClick={() => patch({ campaignId: "none" })}
                  className={cn("w-full text-left px-3 py-1.5 rounded-lg text-sm", filters.campaignId === "none" ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-surface-50")}
                >
                  No campaign
                </button>
              </li>
              {campaigns.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => patch({ campaignId: c.id, showAllStatuses: true })}
                    className={cn("w-full text-left px-3 py-1.5 rounded-lg text-sm truncate", filters.campaignId === c.id ? "bg-primary/10 text-primary font-medium" : "text-gray-800 hover:bg-surface-50")}
                  >
                    {c.name}
                    {c.isArchived && <span className="text-gray-400"> (archived)</span>}
                  </button>
                </li>
              ))}
            </ul>
            <PopoverFooter count={filters.campaignId ? 1 : 0} onClear={() => patch({}, ["campaignId"])} />
          </FilterChip>
        )}

        {activeCount > 0 && (
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5">
            <X size={12} /> Clear all ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
