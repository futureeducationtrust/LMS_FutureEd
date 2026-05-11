"use client";

import { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Phone,
  MessageSquare,
  UserCheck,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { QuickNoteModal } from "./QuickNoteModal";
import { QuickAssignModal } from "./QuickAssignModal";
import { useMarkFollowUpDone } from "@/hooks/useLeads";
import { useAuthStore } from "@/store/auth";
import { Role } from "@lms/types";
import type { LeadSummary } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

dayjs.extend(relativeTime);

type ActiveModal =
  | { type: "note"; lead: LeadSummary }
  | { type: "assign"; lead: LeadSummary }
  | null;

export function LeadCards({ leads }: { leads: LeadSummary[] }) {
  const { user } = useAuthStore();
  const isManager = user?.role === Role.ADMIN || user?.role === Role.SUB_ADMIN;
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const markDone = useMarkFollowUpDone();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.map((lead) => {
          const isOverdue =
            lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
          const primaryCourse = lead.courses.find((c) => c.isPrimary);

          return (
            <div
              key={lead.id}
              className={cn(
                "bg-white rounded-xl border p-4 space-y-3 hover:shadow-sm transition-shadow",
                isOverdue ? "border-red-200" : "border-surface-200",
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <Link href={`/leads/${lead.id}`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 hover:text-primary">
                      {lead.studentName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>
                  </div>
                </Link>
                <StatusBadge status={lead.status} size="sm" />
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                {primaryCourse && (
                  <p className="text-xs text-gray-500">
                    📚 {primaryCourse.course.name}
                  </p>
                )}

                {lead.assignedTo && isManager && (
                  <p className="text-xs text-gray-500">
                    👤 {lead.assignedTo.name}
                  </p>
                )}

                {!lead.assignedTo && isManager && (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠ Unassigned
                  </p>
                )}

                {lead.nextFollowUpAt && (
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isOverdue ? "text-red-600" : "text-gray-500",
                    )}
                  >
                    🕐 {isOverdue ? "⚠ Overdue · " : ""}
                    {dayjs(lead.nextFollowUpAt).fromNow()}
                  </p>
                )}

                {lead.isDuplicate && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <AlertCircle size={10} />
                    Duplicate lead
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 pt-1 border-t border-surface-100">
                <a
                  href={`tel:${lead.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-primary hover:bg-primary-50 transition-colors"
                >
                  <Phone size={13} />
                  Call
                </a>

                <button
                  onClick={() => setActiveModal({ type: "note", lead })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-primary hover:bg-primary-50 transition-colors"
                >
                  <MessageSquare size={13} />
                  Note
                </button>

                {isManager && (
                  <button
                    onClick={() => setActiveModal({ type: "assign", lead })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-primary hover:bg-primary-50 transition-colors"
                  >
                    <UserCheck size={13} />
                    Assign
                  </button>
                )}

                {lead.nextFollowUpAt && (
                  <button
                    onClick={() =>
                      void markDone.mutateAsync({ leadId: lead.id })
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <CheckCircle size={13} />
                    Done
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeModal?.type === "note" && (
        <QuickNoteModal
          leadId={activeModal.lead.id}
          studentName={activeModal.lead.studentName}
          open
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal?.type === "assign" && (
        <QuickAssignModal
          leadId={activeModal.lead.id}
          studentName={activeModal.lead.studentName}
          currentAssignee={activeModal.lead.assignedTo?.id ?? null}
          open
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}
