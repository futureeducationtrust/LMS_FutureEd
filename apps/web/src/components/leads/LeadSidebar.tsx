"use client";

import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  BookOpen,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  X,
  Check,
} from "lucide-react";
import { StatusTransition } from "./StatusTransition";
import { QuickAssignModal } from "./QuickAssignModal";
import { useAuthStore } from "@/store/auth";
import { canAssignLead } from "@lms/auth";
import { Role, type Lead } from "@lms/types";
import { useUpdateLead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

dayjs.extend(relativeTime);

function FollowUpCard({ lead }: { lead: Lead }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const updateLead = useUpdateLead(lead.id);

  const isOverdue =
    lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();

  const PRESETS = [
    { label: "Tomorrow", days: 1 },
    { label: "3 Days", days: 3 },
    { label: "1 Week", days: 7 },
    { label: "2 Weeks", days: 14 },
  ];

  async function save(dateStr: string) {
    await updateLead.mutateAsync({
      nextFollowUpAt: new Date(dateStr).toISOString(),
    });
    setEditing(false);
  }

  async function clear() {
    await updateLead.mutateAsync({ nextFollowUpAt: null });
    setEditing(false);
  }

  async function applyPreset(days: number) {
    const date = dayjs().add(days, "day").hour(10).minute(0).second(0);
    await updateLead.mutateAsync({ nextFollowUpAt: date.toISOString() });
    setEditing(false);
  }

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Next Follow-up
        </p>
        <button
          onClick={() => {
            setEditing(!editing);
            setValue(
              lead.nextFollowUpAt
                ? dayjs(lead.nextFollowUpAt).format("YYYY-MM-DDTHH:mm")
                : "",
            );
          }}
          className="text-xs text-primary font-medium hover:underline"
        >
          {editing ? "Cancel" : lead.nextFollowUpAt ? "Change" : "Set"}
        </button>
      </div>

      {!editing &&
        (lead.nextFollowUpAt ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {dayjs(lead.nextFollowUpAt).format("D MMM YYYY")}
              </p>
              <p className="text-xs text-gray-500">
                {dayjs(lead.nextFollowUpAt).format("h:mm A")}
              </p>
              <p
                className={cn(
                  "text-xs font-medium mt-0.5",
                  isOverdue ? "text-red-600" : "text-gray-400",
                )}
              >
                {isOverdue ? "⚠ Overdue · " : ""}
                {dayjs(lead.nextFollowUpAt).fromNow()}
              </p>
            </div>
            <button
              onClick={() => void clear()}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
              title="Clear follow-up"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Not scheduled</p>
        ))}

      {editing && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => void applyPreset(preset.days)}
                className="py-1.5 px-2 rounded-lg border border-surface-200 text-xs font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">
              Custom date &amp; time
            </label>
            <input
              type="datetime-local"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={dayjs().format("YYYY-MM-DDTHH:mm")}
              placeholder="Select date and time"
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => value && void save(value)}
              disabled={!value || updateLead.isPending}
              className="py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Check size={14} />
              {updateLead.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => void clear()}
              disabled={updateLead.isPending || !lead.nextFollowUpAt}
              className="py-2 rounded-lg border border-surface-200 text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Calendar size={14} />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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

      <FollowUpCard lead={lead} />

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
