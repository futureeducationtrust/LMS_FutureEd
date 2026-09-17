"use client";

import { useState } from "react";
import { Popover } from "radix-ui";
import { Columns3, GripVertical, Lock, RotateCcw, Search } from "lucide-react";
import { LEAD_COLUMNS, MAX_VISIBLE_COLUMNS, type LeadColumnDef, type LeadColumnKey } from "@/hooks/useLeadColumns";
import { cn } from "@/lib/utils";

// "Customise view (n/12)" — TeleCRM's column chooser: checkbox per field,
// drag handles to reorder the visible ones, the name column locked first.
export function ColumnChooser({
  keys,
  available,
  onChange,
  onReset,
}: {
  keys: LeadColumnKey[];
  available: LeadColumnDef[];
  onChange: (next: LeadColumnKey[]) => void;
  onReset: () => void;
}) {
  const [q, setQ] = useState("");
  const [dragging, setDragging] = useState<LeadColumnKey | null>(null);
  const [over, setOver] = useState<LeadColumnKey | null>(null);
  const needle = q.trim().toLowerCase();
  const visible = new Set(keys);
  const atMax = keys.length >= MAX_VISIBLE_COLUMNS;

  const toggle = (k: LeadColumnKey) => {
    if (k === "studentName") return;
    if (visible.has(k)) onChange(keys.filter((x) => x !== k));
    else if (!atMax) onChange([...keys, k]);
  };

  const move = (from: LeadColumnKey, to: LeadColumnKey) => {
    if (from === to || from === "studentName" || to === "studentName") return;
    const next = keys.filter((k) => k !== from);
    const idx = next.indexOf(to);
    next.splice(idx, 0, from);
    onChange(next);
  };

  // Visible (ordered) first, then the rest alphabetically — like TeleCRM.
  const hidden = available.filter((c) => !visible.has(c.key)).sort((a, b) => a.label.localeCompare(b.label));
  const ordered = [...keys.map((k) => LEAD_COLUMNS.find((c) => c.key === k)!), ...hidden].filter(
    (c) => c && (!needle || c.label.toLowerCase().includes(needle)),
  );

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-surface-200 bg-white text-sm text-gray-700 hover:bg-surface-50"
        >
          <Columns3 size={14} className="text-gray-400" /> Columns
          <span className="text-xs text-gray-400 tabular-nums">{keys.length}/{MAX_VISIBLE_COLUMNS}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-72 rounded-xl border border-surface-200 bg-white shadow-lg p-2 outline-none">
          <div className="px-2 pt-1 pb-2">
            <p className="text-sm font-semibold text-gray-900">
              Customise view <span className="text-gray-400 font-normal tabular-nums">({keys.length}/{MAX_VISIBLE_COLUMNS})</span>
            </p>
            <p className="text-[11px] text-gray-500">Tick to show, drag to reorder. Max {MAX_VISIBLE_COLUMNS}.</p>
          </div>
          <div className="relative px-1 pb-1">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fields"
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {ordered.map((c) => {
              const on = visible.has(c.key);
              const locked = !!c.locked;
              return (
                <li
                  key={c.key}
                  draggable={on && !locked && !needle}
                  onDragStart={() => setDragging(c.key)}
                  onDragOver={(e) => { if (dragging && on) { e.preventDefault(); setOver(c.key); } }}
                  onDragLeave={() => setOver(null)}
                  onDrop={() => { if (dragging) move(dragging, c.key); setDragging(null); setOver(null); }}
                  onDragEnd={() => { setDragging(null); setOver(null); }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                    on ? "hover:bg-surface-50" : "hover:bg-surface-50 opacity-90",
                    over === c.key && dragging !== c.key && "ring-2 ring-primary/30",
                    dragging === c.key && "opacity-40",
                  )}
                >
                  <span className={cn("w-4 flex justify-center", on && !locked && !needle ? "cursor-grab text-gray-300" : "text-transparent")}>
                    <GripVertical size={14} />
                  </span>
                  <input
                    id={`col-${c.key}`}
                    type="checkbox"
                    className="accent-primary"
                    checked={on}
                    disabled={locked || (!on && atMax)}
                    onChange={() => toggle(c.key)}
                  />
                  <label htmlFor={`col-${c.key}`} className={cn("text-sm flex-1 truncate cursor-pointer", on ? "text-gray-800" : "text-gray-600")}>{c.label}</label>
                  {locked && <Lock size={12} className="text-gray-300" />}
                  {!on && atMax && <span className="text-[10px] text-gray-400">max</span>}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between px-2 pt-2 mt-1 border-t border-surface-100">
            <span className="text-xs text-gray-500">Saved on this device</span>
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
