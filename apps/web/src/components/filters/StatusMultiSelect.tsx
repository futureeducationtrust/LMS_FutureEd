"use client";

import { useState } from "react";
import { LeadStatus } from "@lms/types";
import { Layers, Search } from "lucide-react";
import { STATUS_CONFIG } from "@/config/leadStatus";
import { FilterChip, PopoverFooter } from "./FilterChip";
import { cn } from "@/lib/utils";

// Statuses grouped by lifecycle stage, the way TeleCRM's status filter is
// laid out (Initial / Active / Closed). Each group has its own checkbox
// that selects or clears every status inside it.
export const STATUS_GROUPS: Array<{ key: string; label: string; statuses: LeadStatus[] }> = [
  { key: "initial", label: "Initial", statuses: [LeadStatus.NEW] },
  {
    key: "active",
    label: "Active",
    statuses: [
      LeadStatus.ATTEMPTED_CONTACT,
      LeadStatus.CONNECTED,
      LeadStatus.NOT_REACHABLE,
      LeadStatus.INTERESTED,
      LeadStatus.FOLLOW_UP_SCHEDULED,
      LeadStatus.APPLICATION_SENT,
      LeadStatus.UNDER_VALIDATION,
    ],
  },
  {
    key: "closed",
    label: "Closed",
    statuses: [LeadStatus.CONFIRMED, LeadStatus.LOST, LeadStatus.NOT_INTERESTED, LeadStatus.DUPLICATE],
  },
];

export function StatusMultiSelect({
  value,
  onChange,
  exclude = [],
  label = "Status",
}: {
  value: LeadStatus[];
  onChange: (next: LeadStatus[]) => void;
  exclude?: LeadStatus[];   // e.g. the workspace's Active tab never offers NEW
  label?: string;
}) {
  const [q, setQ] = useState("");
  const selected = new Set(value);
  const needle = q.trim().toLowerCase();

  const groups = STATUS_GROUPS.map((g) => ({
    ...g,
    statuses: g.statuses.filter((s) => !exclude.includes(s) && (!needle || STATUS_CONFIG[s].label.toLowerCase().includes(needle))),
  })).filter((g) => g.statuses.length > 0);

  const toggle = (s: LeadStatus) => {
    const next = new Set(selected);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange([...next]);
  };
  const toggleGroup = (statuses: LeadStatus[]) => {
    const all = statuses.every((s) => selected.has(s));
    const next = new Set(selected);
    statuses.forEach((s) => (all ? next.delete(s) : next.add(s)));
    onChange([...next]);
  };

  const summary =
    value.length === 0 ? "All" : value.length === 1 ? STATUS_CONFIG[value[0]!].label : `${value.length} selected`;

  return (
    <FilterChip icon={Layers} label={label} value={summary} active={value.length > 0} onClear={() => onChange([])} width={300}>
      <div className="relative px-1 pb-1">
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="w-full pl-8 pr-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
      </div>
      <div className="max-h-72 overflow-y-auto">
        {groups.map((g) => {
          const all = g.statuses.every((s) => selected.has(s));
          const some = !all && g.statuses.some((s) => selected.has(s));
          return (
            <div key={g.key} className="py-1">
              <label className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-surface-50 rounded-lg">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={all}
                  ref={(el) => { if (el) el.indeterminate = some; }}
                  onChange={() => toggleGroup(g.statuses)}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{g.label}</span>
              </label>
              {g.statuses.map((s) => (
                <label key={s} className="flex items-center gap-2.5 pl-8 pr-3 py-1.5 cursor-pointer hover:bg-surface-50 rounded-lg">
                  <input type="checkbox" className="accent-primary" checked={selected.has(s)} onChange={() => toggle(s)} />
                  <span className={cn("w-2.5 h-2.5 rounded-sm shrink-0", STATUS_CONFIG[s].dot)} />
                  <span className="text-sm text-gray-800">{STATUS_CONFIG[s].label}</span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <PopoverFooter count={value.length} onClear={() => onChange([])} />
    </FilterChip>
  );
}
