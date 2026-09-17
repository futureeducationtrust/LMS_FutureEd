"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutList,
  LayoutGrid,
  Plus,
  RefreshCw,
  CheckSquare,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import { useLeadList, useAssignableUsers } from "@/hooks/useLeads";
import { useQueryClient } from "@tanstack/react-query";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadTable } from "@/components/leads/LeadTable";
import { ColumnChooser } from "@/components/leads/ColumnChooser";
import { useLeadColumns } from "@/hooks/useLeadColumns";
import { LeadCards } from "@/components/leads/LeadCards";
import { EmptyLeads } from "@/components/leads/EmptyLeads";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import { Role, LeadStatus } from "@lms/types";
import { STATUS_CONFIG } from "@/config/leadStatus";
import api from "@/lib/api";
import { extractApiError } from "@/lib/utils";
import type { LeadFilters as Filters } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

const ROLE_TAGS: Record<string, string> = {
  ADMIN: "Admin",
  SUB_ADMIN: "Sub Admin",
};

const DEFAULT_FILTERS: Filters = {
  page: 1,
  pageSize: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

export default function LeadsPage() {
  const { user } = useAuthStore();
  const { success, error } = useNotifications();
  const qc = useQueryClient();
  const isManager = user?.role === Role.ADMIN || user?.role === Role.SUB_ADMIN;

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Read URL params on mount to support dashboard deep-links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const patch: Partial<Filters> = {};
    const assignedToId = params.get("assignedToId");
    if (assignedToId) patch.assignedToId = assignedToId;
    const assignedToIds = params.get("assignedToIds");
    if (assignedToIds) patch.assignedToIds = assignedToIds;
    const searchField = params.get("searchField") as Filters["searchField"] | null;
    if (searchField) patch.searchField = searchField;
    const search = params.get("search");
    if (search) patch.search = search;
    const status = params.get("status") as LeadStatus | null;
    if (status) patch.status = status;
    const statuses = params.get("statuses");
    if (statuses) patch.statuses = statuses;
    const interactionType = params.get("interactionType");
    if (interactionType) patch.interactionType = interactionType;
    const interactedByUserId = params.get("interactedByUserId");
    if (interactedByUserId) patch.interactedByUserId = interactedByUserId;
    const dateFrom = params.get("dateFrom");
    if (dateFrom) patch.dateFrom = dateFrom;
    const dateTo = params.get("dateTo");
    if (dateTo) patch.dateTo = dateTo;
    const overdue = params.get("overdue");
    if (overdue === "true") patch.overdue = true;
    const showAllStatuses = params.get("showAllStatuses");
    if (showAllStatuses === "true") patch.showAllStatuses = true;
    const excludeTerminal = params.get("excludeTerminal");
    if (excludeTerminal === "true") patch.excludeTerminal = true;
    const excludeUnassigned = params.get("excludeUnassigned");
    if (excludeUnassigned === "true") patch.excludeUnassigned = true;
    const upcoming = params.get("upcoming");
    if (upcoming === "true") patch.upcoming = true;
    const interactedByOwner = params.get("interactedByOwner");
    if (interactedByOwner === "true") patch.interactedByOwner = true;
    const campaignId = params.get("campaignId");
    if (campaignId) { patch.campaignId = campaignId; patch.showAllStatuses = true; }
    const sourceId = params.get("sourceId");
    if (sourceId) patch.sourceId = sourceId;
    const sortBy = params.get("sortBy");
    if (sortBy) patch.sortBy = sortBy;
    const sortOrder = params.get("sortOrder");
    if (sortOrder === "asc" || sortOrder === "desc") patch.sortOrder = sortOrder;
    const page = Number(params.get("page"));
    if (page > 1) patch.page = page;
    const pageSize = Number(params.get("pageSize"));
    if ([20, 50, 80].includes(pageSize)) patch.pageSize = pageSize;
    if (Object.keys(patch).length > 0) setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  // Mirror the active filters back into the URL (no navigation) so a reload
  // or a shared link lands on the same view — the way TeleCRM behaves.
  useEffect(() => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === "" || v === false) continue;
      if (DEFAULT_FILTERS[k as keyof Filters] === v) continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [filters]);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const leadColumns = useLeadColumns(isManager);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssignModal, setBulkAssignModal] = useState(false);
  const [bulkStatusModal, setBulkStatusModal] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkStatus, setBulkStatus] = useState<LeadStatus | "">("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data, isLoading, isFetching, refetch } = useLeadList(filters);
  const { data: employees } = useAssignableUsers();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    if (selected.size === data.leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.leads.map((l) => l.id)));
    }
  }

  async function handleBulkAssign() {
    if (!bulkAssignee || selected.size === 0) return;
    setBulkLoading(true);
    try {
      await api.post("/leads/bulk-assign", {
        leadIds: Array.from(selected),
        assignedToId: bulkAssignee,
        reason: "Bulk assignment",
      });
      success(`${selected.size} leads assigned successfully`);
      setSelected(new Set());
      setBulkAssignModal(false);
      setBulkAssignee("");
      void qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (e) {
      error("Bulk assign failed", extractApiError(e));
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkStatus() {
    if (!bulkStatus || selected.size === 0) return;
    setBulkLoading(true);
    try {
      const { data: res } = await api.post("/leads/bulk-status", {
        leadIds: Array.from(selected),
        toStatus: bulkStatus,
      });
      const { successful, failed } = res.data;
      success(
        `${successful} leads updated. ${failed.length} skipped (invalid transition).`,
      );
      setSelected(new Set());
      setBulkStatusModal(false);
      setBulkStatus("");
      void qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (e) {
      error("Bulk status failed", extractApiError(e));
    } finally {
      setBulkLoading(false);
    }
  }

  const hasFilters = Object.entries(filters).some(
    ([k, v]) =>
      !["page", "pageSize", "sortBy", "sortOrder"].includes(k) &&
      v !== undefined &&
      v !== "",
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data ? `${data.total} total leads` : "Loading..."}
            {isFetching && !isLoading && (
              <span className="ml-2 text-xs text-gray-400">
                · Refreshing...
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg border border-surface-200 text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            aria-label="Refresh leads"
            title="Refresh leads"
          >
            <RefreshCw size={15} className={cn(isFetching && "animate-spin")} />
          </button>
          <div className="hidden md:block">
            <ColumnChooser keys={leadColumns.keys} available={leadColumns.available} onChange={leadColumns.update} onReset={leadColumns.reset} />
          </div>
          <div className="hidden md:flex items-center border border-surface-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "table"
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:bg-surface-50",
              )}
              aria-label="Table view"
              title="Table view"
            >
              <LayoutList size={15} />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "cards"
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:bg-surface-50",
              )}
              aria-label="Card view"
              title="Card view"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
          <Link href="/leads/new">
            <Button>
              <Plus size={15} />
              <span className="hidden sm:inline">Add Lead</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk action bar — shows when items selected */}
      {isManager && selected.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare size={15} className="text-primary" />
            <span className="text-sm font-semibold text-primary">
              {selected.size} lead{selected.size > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setBulkAssignModal(true)}
            >
              <Users size={13} /> Bulk Assign
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setBulkStatusModal(true)}
            >
              <ArrowRightLeft size={13} /> Bulk Status
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <LeadFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-surface-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : !data || data.leads.length === 0 ? (
        <EmptyLeads
          hasFilters={hasFilters}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      ) : (
        <>
          {/* Mobile — always cards */}
          <div className="md:hidden">
            {isManager && selected.size === 0 && (
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs text-gray-400">
                  Tap cards to select for bulk actions
                </p>
                <button
                  onClick={() =>
                    setSelected(new Set(data.leads.map((l) => l.id)))
                  }
                  className="text-xs text-primary font-medium"
                >
                  Select all
                </button>
              </div>
            )}
            <LeadCards
              leads={data.leads}
              selected={selected}
              onToggle={toggleSelect}
              showBulkSelect={isManager}
            />
          </div>

          {/* Desktop — table with checkboxes or cards */}
          <div className="hidden md:block">
            {viewMode === "table" ? (
              <LeadTable
                leads={data.leads}
                filters={filters}
                columns={leadColumns.columns}
                onSortChange={(field) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: field,
                    sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
                    page: 1,
                  }))
                }
                {...(isManager ? { selection: { selected, onToggle: toggleSelect, onToggleAll: toggleSelectAll } } : {})}
              />
            ) : (
              <LeadCards leads={data.leads} />
            )}
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
            onPageSizeChange={(s) =>
              setFilters((prev) => ({ ...prev, pageSize: s, page: 1 }))
            }
          />
        </>
      )}

      {/* Bulk Assign Modal */}
      <Modal
        open={bulkAssignModal}
        onClose={() => setBulkAssignModal(false)}
        title="Bulk Assign Leads"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBulkAssignModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleBulkAssign()}
              loading={bulkLoading}
              disabled={!bulkAssignee}
            >
              Assign {selected.size} Leads
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Assign <strong>{selected.size} selected leads</strong> to:
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {employees?.map((emp) => (
              <button
                key={emp.id}
                onClick={() => setBulkAssignee(emp.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                  bulkAssignee === emp.id
                    ? "border-primary bg-primary-50"
                    : "border-surface-200 hover:border-primary-300",
                )}
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {emp.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {emp.name}
                  {ROLE_TAGS[emp.role] && (
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      ({ROLE_TAGS[emp.role]})
                    </span>
                  )}
                </span>
                {bulkAssignee === emp.id && (
                  <span className="ml-auto text-primary text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Bulk Status Modal */}
      <Modal
        open={bulkStatusModal}
        onClose={() => setBulkStatusModal(false)}
        title="Bulk Change Status"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBulkStatusModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleBulkStatus()}
              loading={bulkLoading}
              disabled={!bulkStatus}
            >
              Update {selected.size} Leads
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Change status of <strong>{selected.size} leads</strong> to:
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠ Leads with invalid transitions will be skipped automatically.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                onClick={() => setBulkStatus(status as LeadStatus)}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors text-sm",
                  bulkStatus === status
                    ? "border-primary bg-primary-50"
                    : "border-surface-200 hover:border-primary-300",
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    config.dot,
                  )}
                />
                <span className="text-xs font-medium text-gray-700 truncate">
                  {config.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Lead table with bulk select checkboxes
