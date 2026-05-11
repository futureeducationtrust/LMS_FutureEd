"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutList, LayoutGrid, Plus, RefreshCw } from "lucide-react";
import { useLeadList } from "@/hooks/useLeads";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadTable } from "@/components/leads/LeadTable";
import { LeadCards } from "@/components/leads/LeadCards";
import { EmptyLeads } from "@/components/leads/EmptyLeads";
import { Pagination } from "@/components/ui/Pagination";
import type { LeadFilters as Filters } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

const DEFAULT_FILTERS: Filters = {
  page: 1,
  pageSize: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

export default function LeadsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const { data, isLoading, isFetching, refetch } = useLeadList(filters);

  function handleSortChange(field: string) {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder:
        prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    }));
  }

  function handleFilterChange(newFilters: Filters) {
    setFilters(newFilters);
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
  }

  const hasFilters = Object.entries(filters).some(
    ([k, v]) =>
      !["page", "pageSize", "sortBy", "sortOrder"].includes(k) &&
      v !== undefined &&
      v !== "",
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data ? (
              <>
                {data.total} total lead{data.total !== 1 ? "s" : ""}
                {isFetching && !isLoading && (
                  <span className="ml-2 text-xs text-gray-400">
                    · Refreshing...
                  </span>
                )}
              </>
            ) : (
              "Loading..."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual refresh */}
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg border border-surface-200 text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={15} className={cn(isFetching && "animate-spin")} />
          </button>

          {/* View toggle — desktop only */}
          <div className="hidden md:flex items-center border border-surface-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "table"
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:bg-surface-50",
              )}
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
              title="Card view"
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          {/* Add lead */}
          <Link
            href="/leads/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-800 transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add Lead</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <LeadFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : !data || data.leads.length === 0 ? (
        <EmptyLeads hasFilters={hasFilters} onClearFilters={handleReset} />
      ) : (
        <>
          {/* Mobile always shows cards, desktop respects toggle */}
          <div className="md:hidden">
            <LeadCards leads={data.leads} />
          </div>
          <div className="hidden md:block">
            {viewMode === "table" ? (
              <LeadTable
                leads={data.leads}
                filters={filters}
                onSortChange={handleSortChange}
              />
            ) : (
              <LeadCards leads={data.leads} />
            )}
          </div>

          {/* Pagination */}
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
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
