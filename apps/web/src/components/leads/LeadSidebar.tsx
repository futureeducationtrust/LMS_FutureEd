"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { BookOpen, UserCheck, MapPin, Phone, Mail } from "lucide-react";
import { StatusTransition } from "./StatusTransition";
import { QuickAssignModal } from "./QuickAssignModal";
import { useAuthStore } from "@/store/auth";
import { canAssignLead } from "@lms/auth";
import { Role, type Lead } from "@lms/types";

export function LeadSidebar({ lead }: { lead: Lead }) {
  const { user } = useAuthStore();
  const [showAssignModal, setShowAssignModal] = useState(false);

  const canTransition =
    !!user &&
    (user.role === Role.ADMIN ||
      user.role === Role.SUB_ADMIN ||
      lead.assignedTo?.id === user.id);

  const canAssign =
    !!user &&
    canAssignLead({
      id: user.id,
      role: user.role as Role,
      branchId: user.branchId,
    });

  const location = [lead.city, lead.district, lead.state]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className="bg-white border border-surface-200 rounded-xl p-4">
        <StatusTransition
          leadId={lead.id}
          currentStatus={lead.status}
          canTransition={canTransition}
        />
      </div>

      {/* Contact card */}
      <div className="bg-white border border-surface-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Contact
        </p>
        <div className="space-y-2">
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-primary transition-colors"
          >
            <Phone size={14} className="text-gray-400" />
            {lead.phone}
          </a>
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-primary transition-colors"
            >
              <Mail size={14} className="text-gray-400" />
              {lead.email}
            </a>
          )}
          {location && (
            <div className="flex items-start gap-2.5 text-sm text-gray-600">
              <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
              {location}
            </div>
          )}
        </div>
      </div>

      {/* Follow-up card */}
      <div className="bg-white border border-surface-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Next Follow-up
        </p>
        {lead.nextFollowUpAt ? (
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {dayjs(lead.nextFollowUpAt).format("D MMM YYYY")}
            </p>
            <p
              className={
                new Date(lead.nextFollowUpAt) < new Date()
                  ? "text-xs text-red-500 font-medium"
                  : "text-xs text-gray-400"
              }
            >
              {dayjs(lead.nextFollowUpAt).fromNow()}
              {new Date(lead.nextFollowUpAt) < new Date() && " · Overdue"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Not scheduled</p>
        )}
      </div>

      {/* Assignment card */}
      <div className="bg-white border border-surface-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Assigned To
          </p>
          {canAssign && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="text-xs text-primary font-medium hover:underline"
            >
              Change
            </button>
          )}
        </div>

        {lead.assignedTo ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {lead.assignedTo.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {lead.assignedTo.name}
              </p>
              <p className="text-xs text-gray-400">{lead.assignedTo.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <UserCheck size={14} className="text-amber-500" />
            <p className="text-sm text-amber-600 font-medium">Unassigned</p>
          </div>
        )}
      </div>

      {/* Courses card */}
      {lead.courses.length > 0 && (
        <div className="bg-white border border-surface-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Interested Courses
          </p>
          <div className="space-y-1.5">
            {lead.courses.map((lc) => (
              <div key={lc.course.id} className="flex items-center gap-2">
                <BookOpen size={13} className="text-primary shrink-0" />
                <span className="text-sm text-gray-600">{lc.course.name}</span>
                {lc.isPrimary && (
                  <span className="text-xs text-primary bg-primary-50 px-1.5 py-0.5 rounded font-medium">
                    Primary
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAssignModal && (
        <QuickAssignModal
          leadId={lead.id}
          studentName={lead.studentName}
          currentAssignee={lead.assignedTo?.id ?? null}
          open
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}
