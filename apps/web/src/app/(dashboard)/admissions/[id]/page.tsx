"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Check,
  Download,
  Mail,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useNotifications } from "@/store/notifications";
import { extractApiError, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

const QUAL_LEVELS = [
  { key: "TENTH", label: "Matric / X Std." },
  { key: "TWELFTH", label: "Inter / XII Std." },
  { key: "GRADUATION", label: "Graduation / Equivalent" },
  { key: "POST_GRADUATION", label: "PG / Equivalent" },
] as const;

type AcademicRow = {
  stream: string;
  institution: string;
  board: string;
  passingYear: string;
  percentage: string;
  grade: string;
};

type FormState = {
  aadharNo: string;
  apaarId: string;
  motherName: string;
  motherOccupation: string;
  motherIncome: string;
  fatherOccupation: string;
  fatherIncome: string;
  noOfSisters: string;
  noOfBrothers: string;
  nationality: string;
  religion: string;
  category: string;
  permanentAddress: string;
  permanentPhone: string;
  localGuardianName: string;
  localGuardianAddress: string;
  localGuardianPhone: string;
  bookingAmount: string;
  bookingCashDDNo: string;
  bookingBank: string;
  bookingDate: string;
  admissionAmount: string;
  admissionCashDDNo: string;
  admissionBank: string;
  admissionDate: string;
  duesAmount: string;
  dueDate: string;
  extraCurricular: string;
  authorisedBy: string;
};

const emptyForm: FormState = {
  aadharNo: "",
  apaarId: "",
  motherName: "",
  motherOccupation: "",
  motherIncome: "",
  fatherOccupation: "",
  fatherIncome: "",
  noOfSisters: "",
  noOfBrothers: "",
  nationality: "Indian",
  religion: "",
  category: "",
  permanentAddress: "",
  permanentPhone: "",
  localGuardianName: "",
  localGuardianAddress: "",
  localGuardianPhone: "",
  bookingAmount: "",
  bookingCashDDNo: "",
  bookingBank: "",
  bookingDate: "",
  admissionAmount: "",
  admissionCashDDNo: "",
  admissionBank: "",
  admissionDate: "",
  duesAmount: "",
  dueDate: "",
  extraCurricular: "",
  authorisedBy: "",
};

const emptyAcademic: AcademicRow = {
  stream: "",
  institution: "",
  board: "",
  passingYear: "",
  percentage: "",
  grade: "",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-surface-50 border-b border-surface-200">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AdmissionFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { success, error } = useNotifications();

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [academic, setAcademic] = useState<Record<string, AcademicRow>>({
    TENTH: { ...emptyAcademic },
    TWELFTH: { ...emptyAcademic },
    GRADUATION: { ...emptyAcademic },
    POST_GRADUATION: { ...emptyAcademic },
  });
  const [exams, setExams] = useState([
    { examName: "", rollNo: "", score: "", rank: "" },
  ]);

  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${id}`);
      return data.data as any;
    },
  });

  const { data: app, isLoading: appLoading } = useQuery({
    queryKey: ["confirmed", id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/leads/${id}/confirmed`);
        return data.data as any;
      } catch {
        return null;
      }
    },
    enabled: !!lead,
  });

  // Sync form state from fetched confirmed application
  useEffect(() => {
    if (!app) return;

    setForm({
      aadharNo: app.aadharNo ?? "",
      apaarId: app.apaarId ?? "",
      motherName: app.motherName ?? "",
      motherOccupation: app.motherOccupation ?? "",
      motherIncome: String(app.motherIncome ?? ""),
      fatherOccupation: app.fatherOccupation ?? "",
      fatherIncome: String(app.fatherIncome ?? ""),
      noOfSisters: String(app.noOfSisters ?? ""),
      noOfBrothers: String(app.noOfBrothers ?? ""),
      nationality: app.nationality ?? "Indian",
      religion: app.religion ?? "",
      category: app.category ?? "",
      permanentAddress: app.permanentAddress ?? "",
      permanentPhone: app.permanentPhone ?? "",
      localGuardianName: app.localGuardianName ?? "",
      localGuardianAddress: app.localGuardianAddress ?? "",
      localGuardianPhone: app.localGuardianPhone ?? "",
      bookingAmount: String(app.bookingAmount ?? ""),
      bookingCashDDNo: app.bookingCashDDNo ?? "",
      bookingBank: app.bookingBank ?? "",
      bookingDate: app.bookingDate ? (String(app.bookingDate).split("T")[0] ?? "") : "",
      admissionAmount: String(app.admissionAmount ?? ""),
      admissionCashDDNo: app.admissionCashDDNo ?? "",
      admissionBank: app.admissionBank ?? "",
      admissionDate: app.admissionDate
        ? (String(app.admissionDate).split("T")[0] ?? "")
        : "",
      duesAmount: String(app.duesAmount ?? ""),
      dueDate: app.dueDate ? (String(app.dueDate).split("T")[0] ?? "") : "",
      extraCurricular: app.extraCurricular ?? "",
      authorisedBy: app.authorisedBy ?? "",
    });

    if (app.academicRecords?.length) {
      const next = { ...academic };
      for (const rec of app.academicRecords as any[]) {
        if (next[rec.level]) {
          next[rec.level] = {
            stream: rec.stream ?? "",
            institution: rec.institution ?? "",
            board: rec.board ?? "",
            passingYear: String(rec.passingYear ?? ""),
            percentage: String(rec.percentage ?? ""),
            grade: rec.grade ?? "",
          };
        }
      }
      setAcademic(next);
    }

    if (app.entranceExams?.length) {
      setExams(
        (app.entranceExams as any[]).map((e) => ({
          examName: e.examName ?? "",
          rollNo: e.rollNo ?? "",
          score: e.score ?? "",
          rank: String(e.rank ?? ""),
        })),
      );
    }

    if (app.sentToStudentAt) setEmailSent(true);
  }, [app]); // eslint-disable-line react-hooks/exhaustive-deps

  function setField<K extends keyof FormState>(field: K, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function setAcademicField(level: string, field: keyof AcademicRow, value: string) {
    setAcademic((p) => ({ ...p, [level]: { ...p[level]!, [field]: value } }));
  }

  async function saveForm() {
    const payload: Record<string, unknown> = {
      ...form,
      motherIncome: form.motherIncome ? Number(form.motherIncome) : undefined,
      fatherIncome: form.fatherIncome ? Number(form.fatherIncome) : undefined,
      noOfSisters: form.noOfSisters ? Number(form.noOfSisters) : undefined,
      noOfBrothers: form.noOfBrothers ? Number(form.noOfBrothers) : undefined,
      bookingAmount: form.bookingAmount ? Number(form.bookingAmount) : undefined,
      admissionAmount: form.admissionAmount ? Number(form.admissionAmount) : undefined,
      duesAmount: form.duesAmount ? Number(form.duesAmount) : undefined,
      bookingDate: form.bookingDate || undefined,
      admissionDate: form.admissionDate || undefined,
      dueDate: form.dueDate || undefined,
    };

    await api.patch(`/leads/${id}/confirmed`, payload);

    const academicRecords = Object.entries(academic)
      .filter(([, rec]) => rec.institution || rec.board || rec.percentage)
      .map(([level, rec]) => ({
        level,
        stream: rec.stream || undefined,
        institution: rec.institution || undefined,
        board: rec.board || undefined,
        passingYear: rec.passingYear ? Number(rec.passingYear) : undefined,
        percentage: rec.percentage ? Number(rec.percentage) : undefined,
        grade: rec.grade || undefined,
      }));
    await api.post(`/leads/${id}/confirmed/academic`, { records: academicRecords });

    const examRecords = exams
      .filter((e) => e.examName)
      .map((e) => ({
        examName: e.examName,
        rollNo: e.rollNo || undefined,
        score: e.score || undefined,
        rank: e.rank ? Number(e.rank) : undefined,
      }));
    await api.post(`/leads/${id}/confirmed/exams`, { exams: examRecords });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveForm();
      void qc.invalidateQueries({ queryKey: ["confirmed", id] });
      void qc.invalidateQueries({ queryKey: ["lead", id] });
      success("Admission form saved");
    } catch (e) {
      error("Failed to save", extractApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleSendApplication() {
    setSending(true);
    try {
      await saveForm();
      const { data } = await api.post(`/leads/${id}/send-admission`);
      setEmailSent(true);

      if (data.data.emailSent) {
        success(`Application sent! Email delivered to ${data.data.sentTo}`);
      } else {
        success("Application sent! (No email on file for student)");
      }

      void qc.invalidateQueries({ queryKey: ["lead", id] });
      void qc.invalidateQueries({ queryKey: ["admissions-leads"] });

      setTimeout(() => router.push("/confirmed"), 1500);
    } catch (e) {
      error("Failed to send", extractApiError(e));
    } finally {
      setSending(false);
    }
  }

  async function handleDownloadPDF() {
    try {
      const response = await api.get(`/leads/${id}/confirmed/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Admission-${lead?.studentName ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      error("PDF download failed", extractApiError(e));
    }
  }

  if (leadLoading || appLoading) return <Spinner />;

  const isSent = !!app?.sentToStudentAt || emailSent;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} /> Back to Admissions
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {isSent && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <Check size={14} className="text-green-600" />
              <span className="text-xs text-green-700 font-medium">
                Sent
                {app?.sentToStudentEmail ? ` to ${app.sentToStudentEmail}` : ""}
              </span>
            </div>
          )}

          {lead?.email ? (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Mail size={12} className="text-primary" />
              {lead.email}
            </div>
          ) : (
            <span className="text-xs text-amber-600">⚠ No email on file</span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleDownloadPDF()}
          >
            <Download size={13} /> PDF
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleSave()}
            loading={saving}
          >
            <Save size={13} /> Save
          </Button>

          {!isSent && (
            <Button
              size="sm"
              onClick={() => void handleSendApplication()}
              loading={sending}
            >
              <Send size={13} />
              {sending ? "Sending..." : "Save & Send Application"}
            </Button>
          )}
        </div>
      </div>

      {/* Student Info Banner */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-base font-bold text-primary">
              {lead?.studentName}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {lead?.phone} ·{" "}
              {lead?.courses?.[0]?.course?.name ?? "No course selected"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Father: {lead?.fatherName ?? "—"} · DOB:{" "}
              {formatDate(lead?.dateOfBirth)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Branch</p>
            <p className="text-sm font-semibold text-gray-700">
              {lead?.branch?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Identity Documents */}
      <Section title="Identity Documents">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Aadhar Number"
            placeholder="12-digit Aadhar"
            value={form.aadharNo}
            onChange={(e) => setField("aadharNo", e.target.value)}
          />
          <Input
            label="Apaar / ABC ID"
            placeholder="Apaar ID"
            value={form.apaarId}
            onChange={(e) => setField("apaarId", e.target.value)}
          />
        </div>
      </Section>

      {/* Family Background */}
      <Section title="Family Background">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Mother's Name"
            value={form.motherName}
            onChange={(e) => setField("motherName", e.target.value)}
          />
          <Input
            label="Mother's Occupation"
            value={form.motherOccupation}
            onChange={(e) => setField("motherOccupation", e.target.value)}
          />
          <Input
            label="Mother's Annual Income (₹)"
            type="number"
            value={form.motherIncome}
            onChange={(e) => setField("motherIncome", e.target.value)}
          />
          <Input
            label="Father's Occupation"
            value={form.fatherOccupation}
            onChange={(e) => setField("fatherOccupation", e.target.value)}
          />
          <Input
            label="Father's Annual Income (₹)"
            type="number"
            value={form.fatherIncome}
            onChange={(e) => setField("fatherIncome", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="No. of Sisters"
              type="number"
              value={form.noOfSisters}
              onChange={(e) => setField("noOfSisters", e.target.value)}
            />
            <Input
              label="Brothers"
              type="number"
              value={form.noOfBrothers}
              onChange={(e) => setField("noOfBrothers", e.target.value)}
            />
          </div>
          <Input
            label="Nationality"
            value={form.nationality}
            onChange={(e) => setField("nationality", e.target.value)}
          />
          <Input
            label="Religion"
            value={form.religion}
            onChange={(e) => setField("religion", e.target.value)}
          />
          <Input
            label="Category"
            placeholder="General / OBC / SC / ST"
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
          />
        </div>
      </Section>

      {/* Addresses */}
      <Section title="Addresses">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Permanent Address
            </label>
            <textarea
              value={form.permanentAddress}
              rows={2}
              title="Permanent Address"
              placeholder="Enter permanent address"
              onChange={(e) => setField("permanentAddress", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none"
            />
          </div>
          <Input
            label="Permanent Phone"
            value={form.permanentPhone}
            onChange={(e) => setField("permanentPhone", e.target.value)}
          />
          <Input
            label="Local Guardian's Name"
            value={form.localGuardianName}
            onChange={(e) => setField("localGuardianName", e.target.value)}
          />
          <Input
            label="Local Guardian's Phone"
            value={form.localGuardianPhone}
            onChange={(e) => setField("localGuardianPhone", e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Local Guardian's Address
            </label>
            <textarea
              value={form.localGuardianAddress}
              rows={2}
              title="Local Guardian's Address"
              placeholder="Enter local guardian's address"
              onChange={(e) =>
                setField("localGuardianAddress", e.target.value)
              }
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none"
            />
          </div>
        </div>
      </Section>

      {/* Academic Record */}
      <Section title="Academic Record">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50">
                {[
                  "Level",
                  "Stream/Subjects",
                  "Institution",
                  "Board/University",
                  "Year",
                  "Marks%",
                  "Grade",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border border-surface-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QUAL_LEVELS.map(({ key, label }) => {
                const rec = academic[key]!;
                return (
                  <tr key={key}>
                    <td className="px-3 py-2 border border-surface-200 text-xs font-medium text-gray-700 whitespace-nowrap bg-surface-50">
                      {label}
                    </td>
                    {(
                      [
                        "stream",
                        "institution",
                        "board",
                        "passingYear",
                        "percentage",
                        "grade",
                      ] as const
                    ).map((field) => (
                      <td
                        key={field}
                        className="border border-surface-200 p-0"
                      >
                        <input
                          value={rec[field]}
                          title={`${label} – ${field}`}
                          onChange={(e) =>
                            setAcademicField(key, field, e.target.value)
                          }
                          type={
                            field === "passingYear" || field === "percentage"
                              ? "number"
                              : "text"
                          }
                          className="w-full px-2 py-2 text-xs outline-none focus:bg-primary-50 focus:ring-1 focus:ring-primary"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Entrance Exams */}
      <Section title="Entrance Exams (if applicable)">
        <div className="space-y-3">
          {exams.map((exam, i) => (
            <div key={i} className="grid grid-cols-4 gap-3">
              <Input
                {...(i === 0 ? { label: "Exam Name" } : {})}
                placeholder="e.g. JEE Main"
                value={exam.examName}
                onChange={(e) => {
                  const next = [...exams];
                  next[i] = { ...next[i]!, examName: e.target.value };
                  setExams(next);
                }}
              />
              <Input
                {...(i === 0 ? { label: "Roll No." } : {})}
                value={exam.rollNo}
                onChange={(e) => {
                  const next = [...exams];
                  next[i] = { ...next[i]!, rollNo: e.target.value };
                  setExams(next);
                }}
              />
              <Input
                {...(i === 0 ? { label: "Score" } : {})}
                value={exam.score}
                onChange={(e) => {
                  const next = [...exams];
                  next[i] = { ...next[i]!, score: e.target.value };
                  setExams(next);
                }}
              />
              <Input
                {...(i === 0 ? { label: "Rank" } : {})}
                type="number"
                value={exam.rank}
                onChange={(e) => {
                  const next = [...exams];
                  next[i] = { ...next[i]!, rank: e.target.value };
                  setExams(next);
                }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setExams([
                ...exams,
                { examName: "", rollNo: "", score: "", rank: "" },
              ])
            }
            className="text-xs text-primary hover:underline"
          >
            + Add another exam
          </button>
        </div>
      </Section>

      {/* Payment Details */}
      <Section title="Payment Details (Office Use)">
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Booking Amount (₹)"
            type="number"
            value={form.bookingAmount}
            onChange={(e) => setField("bookingAmount", e.target.value)}
          />
          <Input
            label="Cash/DD No."
            value={form.bookingCashDDNo}
            onChange={(e) => setField("bookingCashDDNo", e.target.value)}
          />
          <Input
            label="Bank"
            value={form.bookingBank}
            onChange={(e) => setField("bookingBank", e.target.value)}
          />
          <Input
            label="Admission Amount (₹)"
            type="number"
            value={form.admissionAmount}
            onChange={(e) => setField("admissionAmount", e.target.value)}
          />
          <Input
            label="Cash/DD No."
            value={form.admissionCashDDNo}
            onChange={(e) => setField("admissionCashDDNo", e.target.value)}
          />
          <Input
            label="Bank"
            value={form.admissionBank}
            onChange={(e) => setField("admissionBank", e.target.value)}
          />
          <Input
            label="Dues Amount (₹)"
            type="number"
            value={form.duesAmount}
            onChange={(e) => setField("duesAmount", e.target.value)}
          />
          <Input
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setField("dueDate", e.target.value)}
          />
        </div>
      </Section>

      {/* Other */}
      <Section title="Other Details">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Extra Curricular Activities"
            value={form.extraCurricular}
            onChange={(e) => setField("extraCurricular", e.target.value)}
          />
          <Input
            label="Authorised By"
            value={form.authorisedBy}
            onChange={(e) => setField("authorisedBy", e.target.value)}
          />
        </div>
      </Section>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 px-6 py-3 flex items-center justify-end gap-3 z-10">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void handleSave()}
          loading={saving}
        >
          <Save size={13} /> Save draft
        </Button>
        {!isSent && (
          <Button
            size="sm"
            onClick={() => void handleSendApplication()}
            loading={sending}
          >
            <Send size={13} />
            {sending ? "Sending..." : "Save & Send Application"}
          </Button>
        )}
      </div>
    </div>
  );
}
