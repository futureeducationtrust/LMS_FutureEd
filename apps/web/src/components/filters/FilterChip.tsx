"use client";

import { Popover } from "radix-ui";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

// A TeleCRM-style filter chip: a rounded trigger that reads "Label · value"
// and opens a popover with the control. `active` tints it; `onClear` adds
// an inline ✕ so a filter can be dropped without opening it.
export function FilterChip({
  icon: Icon,
  label,
  value,
  active,
  onClear,
  children,
  align = "start",
  width = 288,
}: {
  icon?: React.ElementType;
  label: string;
  value?: string;
  active?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
  align?: "start" | "end";
  width?: number;
}) {
  return (
    <Popover.Root>
      <div
        className={cn(
          "inline-flex items-center rounded-full border text-sm transition-colors",
          active ? "border-primary/40 bg-primary/5 text-primary" : "border-surface-200 bg-white text-gray-700 hover:bg-surface-50",
        )}
      >
        <Popover.Trigger asChild>
          <button type="button" className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 max-w-[240px]">
            {Icon && <Icon size={14} className={active ? "text-primary" : "text-gray-400"} />}
            <span className={cn("truncate", active ? "font-medium" : "")}>
              {label}
              {value && <span className={cn("ml-1", active ? "text-primary" : "text-gray-500")}>· {value}</span>}
            </span>
            <ChevronDown size={14} className="shrink-0 opacity-60" />
          </button>
        </Popover.Trigger>
        {active && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            className="pr-2.5 pl-0.5 py-1.5 text-primary/70 hover:text-primary"
          >
            <X size={13} />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          style={{ width }}
          className="z-50 rounded-xl border border-surface-200 bg-white shadow-lg p-2 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function PopoverFooter({ count, onClear }: { count: number; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-2 pt-2 mt-1 border-t border-surface-100">
      <span className="text-xs text-gray-500 tabular-nums">{count} selected</span>
      <button type="button" onClick={onClear} disabled={count === 0} className="text-xs font-medium text-primary disabled:text-gray-300">
        Clear
      </button>
    </div>
  );
}
