"use client";

import { CalendarDays } from "lucide-react";
import { DATE_PRESETS, matchPreset, presetRange, formatRange, type DatePreset, type DateRange } from "@/lib/dateRanges";
import { FilterChip } from "./FilterChip";
import { cn } from "@/lib/utils";

// Creation-date chip with TeleCRM's presets and a Custom range.
export function DatePresetSelect({
  value,
  onChange,
  label = "Created",
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  label?: string;
}) {
  const preset = matchPreset(value);
  const active = preset !== "all";

  const pick = (p: DatePreset) => {
    if (p === "custom") {
      // Seed a sensible custom range so the inputs aren't empty
      onChange(value.dateFrom || value.dateTo ? value : presetRange("thisMonth"));
      return;
    }
    onChange(presetRange(p));
  };

  return (
    <FilterChip icon={CalendarDays} label={label} value={active ? formatRange(value) : "All"} active={active} onClear={() => onChange({})} width={260}>
      <div className="grid grid-cols-2 gap-1 p-1">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => pick(p.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm text-left",
              preset === p.value ? "bg-primary text-white" : "text-gray-700 hover:bg-surface-50",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2 px-2 pt-2 mt-1 border-t border-surface-100">
          <input
            type="date"
            value={value.dateFrom ?? ""}
            onChange={(e) => onChange({ ...value, dateFrom: e.target.value || undefined })}
            aria-label="From"
            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-surface-200 rounded-lg bg-white"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={value.dateTo ?? ""}
            onChange={(e) => onChange({ ...value, dateTo: e.target.value || undefined })}
            aria-label="To"
            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-surface-200 rounded-lg bg-white"
          />
        </div>
      )}
    </FilterChip>
  );
}
