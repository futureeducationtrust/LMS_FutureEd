"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchField = "all" | "name" | "phone" | "altPhone" | "email";

const FIELDS: Array<{ value: SearchField; label: string }> = [
  { value: "all", label: "Auto" },
  { value: "name", label: "Name" },
  { value: "phone", label: "Phone" },
  { value: "altPhone", label: "Alt. phone" },
  { value: "email", label: "Email" },
];

// TeleCRM's search box: a field selector fused to the input. Emits on Enter
// or after a short pause so the list doesn't refetch on every keystroke.
export function SearchByField({
  value,
  field,
  onChange,
  placeholder = "Search leads",
  className,
  compact,
}: {
  value: string;
  field: SearchField;
  onChange: (next: { search: string; field: SearchField }) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (draft === value) return;
    const t = window.setTimeout(() => onChange({ search: draft, field }), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div className={cn("flex items-stretch rounded-lg border border-surface-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-primary/25", className)}>
      <select
        value={field}
        onChange={(e) => onChange({ search: value, field: e.target.value as SearchField })}
        aria-label="Search in"
        className={cn("bg-surface-50 border-r border-surface-200 text-gray-600 outline-none", compact ? "px-1.5 text-xs" : "px-2 text-sm")}
      >
        {FIELDS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <div className="relative flex-1 min-w-0">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onChange({ search: draft, field })}
          placeholder={placeholder}
          inputMode={field === "phone" || field === "altPhone" ? "numeric" : undefined}
          className={cn("w-full pl-7 pr-7 outline-none bg-transparent", compact ? "py-1.5 text-sm" : "py-2 text-sm")}
        />
        {draft && (
          <button
            type="button"
            onClick={() => { setDraft(""); onChange({ search: "", field }); }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
