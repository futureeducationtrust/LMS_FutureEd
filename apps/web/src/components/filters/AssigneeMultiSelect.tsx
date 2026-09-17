"use client";

import { useState } from "react";
import { Search, UserRound } from "lucide-react";
import { useStaffList } from "@/hooks/useLeads";
import { FilterChip, PopoverFooter } from "./FilterChip";

export const UNASSIGNED = "unassigned";

// Multi-select assignee filter. `unassigned` is a first-class option so
// "show me everything nobody owns" is one click, like TeleCRM.
export function AssigneeMultiSelect({
  value,
  onChange,
  label = "Assignee",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const { data: users = [] } = useStaffList();
  const [q, setQ] = useState("");
  const selected = new Set(value);
  const needle = q.trim().toLowerCase();
  const list = users.filter((u) => !needle || u.name.toLowerCase().includes(needle));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const summary =
    value.length === 0
      ? "All"
      : value.length === 1
        ? value[0] === UNASSIGNED
          ? "Unassigned"
          : (users.find((u) => u.id === value[0])?.name.split(" ")[0] ?? "1 selected")
        : `${value.length} selected`;

  return (
    <FilterChip icon={UserRound} label={label} value={summary} active={value.length > 0} onClear={() => onChange([])} width={280}>
      <div className="relative px-1 pb-1">
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="w-full pl-8 pr-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {!needle && (
          <label className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-surface-50 rounded-lg">
            <input type="checkbox" className="accent-primary" checked={selected.has(UNASSIGNED)} onChange={() => toggle(UNASSIGNED)} />
            <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold flex items-center justify-center">—</span>
            <span className="text-sm text-amber-700 font-medium">Unassigned</span>
          </label>
        )}
        {list.map((u) => (
          <label key={u.id} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-surface-50 rounded-lg">
            <input type="checkbox" className="accent-primary" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
              {u.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-sm text-gray-800 flex-1 truncate">{u.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-gray-400">{u.role.replace("_", " ")}</span>
          </label>
        ))}
        {list.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No one matches.</p>}
      </div>
      <PopoverFooter count={value.length} onClear={() => onChange([])} />
    </FilterChip>
  );
}
