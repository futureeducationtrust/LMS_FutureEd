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
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { QuickNoteModal } from "./QuickNoteModal";
import { QuickAssignModal } from "./QuickAssignModal";
import { useMarkFollowUpDone } from "@/hooks/useLeads";
import { useAuthStore } from "@/store/auth";
import { Role } from "@lms/types";
import type { LeadSummary, LeadFilters } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

dayjs.extend(relativeTime);

type Props = {
  leads: LeadSummary[];
  filters: LeadFilters;
  onSortChange: (field: string) => void;
};

type ActiveModal =
  | { type: "note"; lead: LeadSummary }
  | { type: "assign"; lead: LeadSummary }
  | null;

function SortIcon({
  field,
  current,
  order,
}: {
  field: string;
  current: string | undefined;
  order: string | undefined;
}) {
  if (current !== field)
    return <ChevronUp size={12} className="text-gray-300" />;
  return order === "asc" ? (
    <ChevronUp size={12} className="text-primary" />
  ) : (
    <ChevronDown size={12} className="text-primary" />
  );
}

export function LeadTable({ leads, filters, onSortChange }: Props) {
  const { user } = useAuthStore();
  const isManager = user?.role === Role.ADMIN || user?.role === Role.SUB_ADMIN;
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const markDone = useMarkFollowUpDone();

  const columns = [
    { key: "studentName", label: "Student" },
    { key: "status", label: "Status" },
    { key: "courses", label: "Course" },
    { key: "assignedTo", label: "Counsellor", managerOnly: true },
    { key: "nextFollowUpAt", label: "Follow-up" },
    { key: "createdAt", label: "Added" },
    { key: "actions", label: "", sortable: false },
  ];

  return (
    <>
      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                {columns
                  .filter((c) => !c.managerOnly || isManager)
                  .map((col) => (
                    <th
                      key={col.key}
                      onClick={() =>
                        col.key !== "actions" && onSortChange(col.key)
                      }
                      className={cn(
                        "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide",
                        col.key !== "actions" &&
                          "cursor-pointer hover:text-gray-700 select-none",
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.key !== "actions" && (
                          <SortIcon
                            field={col.key}
                            current={filters.sortBy}
                            order={filters.sortOrder}
                          />
                        )}
                      </div>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {leads.map((lead) => {
                const isOverdue =
                  lead.nextFollowUpAt &&
                  new Date(lead.nextFollowUpAt) < new Date();
                const primaryCourse = lead.courses.find((c) => c.isPrimary);

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-surface-50 transition-colors"
                  >
                    {/* Student */}
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`}>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors">
                            {lead.studentName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {lead.phone}
                          </p>
                          {lead.isDuplicate && (
                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <AlertCircle size={10} />
                              Duplicate
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>

                    {/* Course */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">
                        {primaryCourse?.course.name ?? "—"}
                      </span>
                    </td>

                    {/* Counsellor — managers only */}
                    {isManager && (
                      <td className="px-4 py-3">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {lead.assignedTo.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs text-gray-600">
                              {lead.assignedTo.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">
                            Unassigned
                          </span>
                        )}
                      </td>
                    )}

                    {/* Follow-up */}
                    <td className="px-4 py-3">
                      {lead.nextFollowUpAt ? (
                        <span
                          className={cn(
                            "text-xs font-medium",
                            isOverdue ? "text-red-600" : "text-gray-600",
                          )}
                        >
                          {isOverdue && "⚠ "}
                          {dayjs(lead.nextFollowUpAt).fromNow()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Added */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">
                        {dayjs(lead.createdAt).fromNow()}
                      </span>
                    </td>

                    {/* Quick Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Call */}
                        <a
                          href={`tel:${lead.phone}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                          title="Call"
                        >
                          <Phone size={14} />
                        </a>

                        {/* Quick note */}
                        <button
                          onClick={() => setActiveModal({ type: "note", lead })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                          title="Add note"
                        >
                          <MessageSquare size={14} />
                        </button>

                        {/* Assign — managers only */}
                        {isManager && (
                          <button
                            onClick={() =>
                              setActiveModal({ type: "assign", lead })
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                            title="Assign"
                          >
                            <UserCheck size={14} />
                          </button>
                        )}

                        {/* Follow-up done */}
                        {lead.nextFollowUpAt && (
                          <button
                            onClick={() =>
                              void markDone.mutateAsync({
                                leadId: lead.id,
                              })
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Mark follow-up done"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
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
