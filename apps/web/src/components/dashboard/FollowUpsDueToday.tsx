"use client";

import Link from "next/link";
import { Phone, FileText, AlertCircle } from "lucide-react";
import { useFollowUpCompliance } from "@/hooks/useDashboard";
import { StatusBadge } from "@/components/leads/StatusBadge";
import type { LeadStatus } from "@lms/types";
import { cn } from "@/lib/utils";

export function FollowUpsDueToday() {
  const { data, isLoading } = useFollowUpCompliance();
  type FollowUpLead = {
    id: string;
    nextFollowUpAt: string | number | Date | null;
    studentName: string;
    phone?: string;
    status: LeadStatus;
  };

  const payload = (data ?? {}) as { overdueLeads?: FollowUpLead[] };
  const leads: FollowUpLead[] = Array.isArray(payload.overdueLeads)
    ? payload.overdueLeads
    : [];

  const overdueCount = leads.filter((l: FollowUpLead) => {
    const next = l.nextFollowUpAt ? new Date(l.nextFollowUpAt) : null;
    return next !== null && next < new Date();
  }).length;

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">
          Follow-ups Due Today
        </h3>
        {overdueCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            <AlertCircle size={10} />
            {overdueCount} overdue
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-surface-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-green-600 font-medium">✓ All caught up!</p>
          <p className="text-xs text-gray-400 mt-1">No follow-ups due today</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {leads.map((lead: FollowUpLead) => {
            const next = lead.nextFollowUpAt
              ? new Date(lead.nextFollowUpAt)
              : null;
            const isOverdue = next !== null && next < new Date();
            return (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-surface-50",
                  isOverdue ? "border-red-200 bg-red-50" : "border-surface-200",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {lead.studentName}
                    </p>
                    <StatusBadge status={lead.status as LeadStatus} size="sm" />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lead.phone}
                    {isOverdue && (
                      <span className="text-red-500 ml-2 font-medium">
                        OVERDUE
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof window !== "undefined") {
                        window.location.href = `tel:${lead.phone}`;
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                    aria-label={`Call ${lead.studentName}`}
                    title={`Call ${lead.studentName}`}
                  >
                    <Phone size={13} />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                    aria-label={`View notes for ${lead.studentName}`}
                    title={`View notes for ${lead.studentName}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText size={13} />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
