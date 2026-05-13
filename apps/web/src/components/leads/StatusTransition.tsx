"use client";

import { useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import { VALID_TRANSITIONS, LeadStatus } from "@lms/types";
import { STATUS_CONFIG } from "@/config/leadStatus";
import { useTransitionLead } from "@/hooks/useLeadDetail";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

type Props = {
  leadId: string;
  currentStatus: LeadStatus;
  canTransition: boolean;
};

export function StatusTransition({
  leadId,
  currentStatus,
  canTransition,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);
  const [note, setNote] = useState("");
  const [appSentModal, setAppSentModal] = useState(false);
  const [appSentForm, setAppSentForm] = useState({
    institutionName: "",
    programName: "",
    applicationNumber: "",
    sendEmailToStudent: false,
    note: "",
  });
  const transition = useTransitionLead(leadId);

  const validNext = VALID_TRANSITIONS[currentStatus] ?? [];

  async function handleConfirm() {
    if (!selectedStatus) return;
    await transition.mutateAsync({
      toStatus: selectedStatus,
      ...(note.trim() && { note: note.trim() }),
    });
    setSelectedStatus(null);
    setNote("");
    setOpen(false);
  }

  async function handleApplicationSentConfirm() {
    const noteParts = [
      `Application sent to: ${appSentForm.institutionName}`,
      appSentForm.programName && `Program: ${appSentForm.programName}`,
      appSentForm.applicationNumber &&
        `Application No: ${appSentForm.applicationNumber}`,
      appSentForm.note.trim(),
    ].filter(Boolean);

    await transition.mutateAsync({
      toStatus: LeadStatus.APPLICATION_SENT,
      note: noteParts.join("\n"),
      sendEmailToStudent: appSentForm.sendEmailToStudent,
      institutionName: appSentForm.institutionName,
      programName: appSentForm.programName || undefined,
      applicationNumber: appSentForm.applicationNumber || undefined,
    });

    setAppSentModal(false);
    setAppSentForm({
      institutionName: "",
      programName: "",
      applicationNumber: "",
      sendEmailToStudent: false,
      note: "",
    });
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Status
        </span>
      </div>

      <StatusBadge status={currentStatus} size="md" />

      {canTransition && validNext.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-surface-200 text-sm text-gray-600 hover:border-primary transition-colors bg-white"
          >
            <span>Move to...</span>
            <ChevronDown
              size={14}
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>

          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {validNext.map((status) => {
                const config = STATUS_CONFIG[status];
                return (
                  <button
                    key={status}
                    onClick={() => {
                      if (status === LeadStatus.APPLICATION_SENT) {
                        setAppSentModal(true);
                        setOpen(false);
                      } else {
                        setSelectedStatus(status);
                        setOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 transition-colors text-left"
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        config.dot,
                      )}
                    />
                    <span className="text-sm text-gray-700">
                      {config.label}
                    </span>
                    <ArrowRight size={12} className="ml-auto text-gray-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation panel */}
      {selectedStatus && (
        <div className="border border-surface-200 rounded-xl p-3 space-y-3 bg-surface-50">
          <div className="flex items-center gap-2 text-sm">
            <StatusBadge status={currentStatus} size="sm" />
            <ArrowRight size={12} className="text-gray-400" />
            <StatusBadge status={selectedStatus} size="sm" />
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for this transition (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none bg-white"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStatus(null)}
              className="flex-1 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-surface-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleConfirm()}
              disabled={transition.isPending}
              className="flex-1 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-800 rounded-lg disabled:opacity-50 transition-colors"
            >
              {transition.isPending ? "Moving..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {appSentModal && (
        <div className="border border-indigo-200 rounded-xl p-4 space-y-3 bg-indigo-50 mt-2">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
            Application Sent Details
          </p>

          <div className="space-y-2">
            <input
              placeholder="Institution / College Name *"
              value={appSentForm.institutionName}
              onChange={(e) =>
                setAppSentForm((p) => ({
                  ...p,
                  institutionName: e.target.value,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
            />
            <input
              placeholder="Program / Course Name"
              value={appSentForm.programName}
              onChange={(e) =>
                setAppSentForm((p) => ({ ...p, programName: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
            />
            <input
              placeholder="Application / Form Number (optional)"
              value={appSentForm.applicationNumber}
              onChange={(e) =>
                setAppSentForm((p) => ({
                  ...p,
                  applicationNumber: e.target.value,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
            />
            <textarea
              placeholder="Additional notes"
              value={appSentForm.note}
              onChange={(e) =>
                setAppSentForm((p) => ({ ...p, note: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none bg-white"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={appSentForm.sendEmailToStudent}
                onChange={(e) =>
                  setAppSentForm((p) => ({
                    ...p,
                    sendEmailToStudent: e.target.checked,
                  }))
                }
                className="accent-primary w-4 h-4"
              />
              <span className="text-xs text-gray-600">
                Send confirmation email to student
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setAppSentModal(false);
                setAppSentForm({
                  institutionName: "",
                  programName: "",
                  applicationNumber: "",
                  sendEmailToStudent: false,
                  note: "",
                });
              }}
              className="flex-1 py-1.5 text-xs text-gray-500 border border-surface-200 rounded-lg hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              disabled={!appSentForm.institutionName || transition.isPending}
              onClick={() => void handleApplicationSentConfirm()}
              className="flex-1 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {transition.isPending ? "Sending..." : "Confirm Sent"}
            </button>
          </div>
        </div>
      )}

      {validNext.length === 0 && (
        <p className="text-xs text-gray-400 italic">
          {currentStatus === LeadStatus.CONFIRMED
            ? "Lead is confirmed — no further transitions"
            : currentStatus === LeadStatus.DUPLICATE
              ? "Duplicate leads cannot be transitioned"
              : "No transitions available"}
        </p>
      )}
    </div>
  );
}
