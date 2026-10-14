"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import dayjs from "dayjs";
import api from "@/lib/api";
import toast from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { extractApiError } from "@/lib/utils";

// Excel export for the Leads / Interested / Admissions lists. Sends the
// page's current filters to GET /leads/export (same filters as the list,
// no paging) and builds the .xlsx in the browser. Available to every
// role; the server scopes employees to their own leads.

type ExportLead = {
  studentName: string;
  fatherName: string | null;
  phone: string;
  alternatePhone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  status: string;
  gender: string | null;
  qualification: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  remarks: string | null;
  nextFollowUpAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  source: { name: string } | null;
  campaign: { name: string } | null;
  assignedTo: { name: string } | null;
  createdBy: { name: string } | null;
  courses: Array<{ isPrimary: boolean; course: { name: string } }>;
  confirmedApplication: {
    admissionId: string | null;
    fileNumber: string | null;
    isFormComplete: boolean;
    sentToStudentAt: string | null;
    category: string | null;
    bookingAmount: number | null;
    bookingDate: string | null;
    admissionAmount: number | null;
    admissionDate: string | null;
    duesAmount: number | null;
    dueDate: string | null;
  } | null;
};

const d = (v: string | null | undefined) => (v ? dayjs(v).format("DD-MM-YYYY") : "");
const dt = (v: string | null | undefined) => (v ? dayjs(v).format("DD-MM-YYYY hh:mm A") : "");
const label = (v: string | null | undefined) => (v ? v.replace(/_/g, " ") : "");

function formStatus(l: ExportLead): string {
  const a = l.confirmedApplication;
  if (!a) return "Not started";
  if (a.sentToStudentAt) return "Sent";
  if (a.isFormComplete) return "Ready to send";
  return "In progress";
}

function baseColumns(l: ExportLead): Record<string, string | number> {
  const course = l.courses.find((c) => c.isPrimary)?.course.name ?? l.courses[0]?.course.name ?? "";
  return {
    "Student Name": l.studentName,
    "Father Name": l.fatherName ?? "",
    Phone: l.phone,
    "Alternate Phone": l.alternatePhone ?? "",
    WhatsApp: l.whatsappNumber ?? "",
    Email: l.email ?? "",
    Course: course,
    "Other Courses": l.courses.filter((c) => c.course.name !== course).map((c) => c.course.name).join(", "),
    Status: label(l.status),
    Gender: label(l.gender),
    Qualification: label(l.qualification),
    City: l.city ?? "",
    District: l.district ?? "",
    State: l.state ?? "",
    Source: l.source?.name ?? "",
    Campaign: l.campaign?.name ?? "",
    Counsellor: l.assignedTo?.name ?? "Unassigned",
  };
}

function row(l: ExportLead, mode: ExportMode): Record<string, string | number> {
  const base = baseColumns(l);
  if (mode === "leads") {
    return {
      ...base,
      "Next Follow-up": dt(l.nextFollowUpAt),
      Remarks: l.remarks ?? "",
      "Created By": l.createdBy?.name ?? "",
      "Created On": dt(l.createdAt),
    };
  }
  if (mode === "interested") {
    return {
      ...base,
      "Form Status": formStatus(l),
      "Next Follow-up": dt(l.nextFollowUpAt),
      Remarks: l.remarks ?? "",
      "Created On": dt(l.createdAt),
    };
  }
  const a = l.confirmedApplication;
  return {
    "Admission ID": a?.admissionId ?? "",
    "File No.": a?.fileNumber ?? "",
    ...base,
    Category: a?.category ?? "",
    "Confirmed On": d(l.confirmedAt),
    "Booking Amount": a?.bookingAmount ?? "",
    "Booking Date": d(a?.bookingDate),
    "Admission Amount": a?.admissionAmount ?? "",
    "Admission Date": d(a?.admissionDate),
    "Dues Amount": a?.duesAmount ?? "",
    "Due Date": d(a?.dueDate),
    "Form Status": formStatus(l),
    Remarks: l.remarks ?? "",
  };
}

export type ExportMode = "leads" | "interested" | "admissions";

export function ExportExcelButton({
  params,
  mode,
  fileName,
}: {
  params: Record<string, string | number | boolean | undefined | null>;
  mode: ExportMode;
  fileName: string; // without extension; date is appended
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (["page", "pageSize"].includes(k)) continue;
        if (v === undefined || v === null || v === "" || v === false) continue;
        qs.set(k, String(v));
      }
      const { data } = await api.get<{
        success: true;
        data: { leads: ExportLead[]; total: number; truncated: boolean };
      }>(`/leads/export?${qs.toString()}`, { timeout: 2 * 60_000 });
      const { leads, total, truncated } = data.data;
      if (leads.length === 0) {
        toast.warning("Nothing to export with the current filters.");
        return;
      }

      const XLSX = await import("xlsx");
      const rows = leads.map((l) => row(l, mode));
      const sheet = XLSX.utils.json_to_sheet(rows);
      // Column widths from the longest value in each column (capped).
      const headers = Object.keys(rows[0]!);
      sheet["!cols"] = headers.map((h) => ({
        wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[h] ?? "").length)) + 2),
      }));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, mode === "admissions" ? "Admissions" : mode === "interested" ? "Interested" : "Leads");
      XLSX.writeFile(book, `${fileName}-${dayjs().format("YYYY-MM-DD")}.xlsx`);

      if (truncated) {
        toast.warning(`Exported the first ${leads.length} of ${total} rows. Narrow the filters to export the rest.`);
      } else {
        toast.success(`Exported ${leads.length} row${leads.length === 1 ? "" : "s"}`);
      }
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={() => void run()} loading={busy} title="Export to Excel">
      <FileSpreadsheet size={15} />
      <span className="hidden sm:inline">Export Excel</span>
    </Button>
  );
}
