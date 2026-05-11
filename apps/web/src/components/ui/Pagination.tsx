"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium text-gray-700">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-gray-700">{total}</span> leads
      </p>

      <div className="flex items-center gap-3">
        {/* Page size */}
        <select
          value={pageSize}
          aria-label="Rows per page"
          title="Rows per page"
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-sm border border-surface-200 rounded-lg px-2 py-1 outline-none focus:border-primary bg-white"
        >
          {[20, 50, 80].map((s) => (
            <option key={s} value={s}>
              {s} per page
            </option>
          ))}
        </select>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            title="Previous page"
            className="p-1.5 rounded-lg border border-surface-200 text-gray-500 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
          </button>

          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum =
              totalPages <= 5
                ? i + 1
                : page <= 3
                  ? i + 1
                  : page >= totalPages - 2
                    ? totalPages - 4 + i
                    : page - 2 + i;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                  pageNum === page
                    ? "bg-primary text-white"
                    : "border border-surface-200 text-gray-600 hover:border-primary hover:text-primary",
                )}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            title="Next page"
            className="p-1.5 rounded-lg border border-surface-200 text-gray-500 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
