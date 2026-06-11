"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Send, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { extractApiError } from "@/lib/utils";

type FormState = {
  studentName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  course: string;
  aadharNo: string;
  apaarId: string;
  gender: string;
  maritalStatus: string;
  fatherName: string;
  fatherOccupation: string;
  fatherIncome: string;
  motherName: string;
  motherOccupation: string;
  motherIncome: string;
  noOfSisters: string;
  noOfBrothers: string;
  nationality: string;
  religion: string;
  category: string;
  postalAddress: string;
  city: string;
  district: string;
  state: string;
  permanentAddress: string;
  permanentPhone: string;
  localGuardianName: string;
  localGuardianPhone: string;
  localGuardianAddress: string;
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
  remarks: string;
};

type AcademicRow = {
  stream: string;
  institution: string;
  board: string;
  passingYear: string;
  percentage: string;
  grade: string;
};

type ExamRow = {
  examName: string;
  rollNo: string;
  score: string;
  rank: string;
};

const QUAL_LEVELS = [
  { key: "TENTH", label: "Matric / X Std." },
  { key: "TWELFTH", label: "Inter / XII Std." },
  { key: "GRADUATION", label: "Graduation / Equivalent" },
  { key: "POST_GRADUATION", label: "PG / Equivalent" },
] as const;

const emptyAcademic: AcademicRow = {
  stream: "",
  institution: "",
  board: "",
  passingYear: "",
  percentage: "",
  grade: "",
};

const emptyForm: FormState = {
  studentName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  course: "",
  aadharNo: "",
  apaarId: "",
  gender: "",
  maritalStatus: "",
  fatherName: "",
  fatherOccupation: "",
  fatherIncome: "",
  motherName: "",
  motherOccupation: "",
  motherIncome: "",
  noOfSisters: "",
  noOfBrothers: "",
  nationality: "Indian",
  religion: "",
  category: "",
  postalAddress: "",
  city: "",
  district: "",
  state: "",
  permanentAddress: "",
  permanentPhone: "",
  localGuardianName: "",
  localGuardianPhone: "",
  localGuardianAddress: "",
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
  remarks: "",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {textarea ? (
        <textarea
          title={label}
          placeholder={placeholder}
          value={value}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none"
        />
      ) : (
        <input
          type={type}
          title={label}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary"
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={label}
        className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DirectAdmissionsPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [academic, setAcademic] = useState<Record<string, AcademicRow>>({
    TENTH: { ...emptyAcademic },
    TWELFTH: { ...emptyAcademic },
    GRADUATION: { ...emptyAcademic },
    POST_GRADUATION: { ...emptyAcademic },
  });
  const [exams, setExams] = useState<ExamRow[]>([
    { examName: "", rollNo: "", score: "", rank: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);

  function f(field: keyof FormState) {
    return {
      value: form[field],
      onChange: (v: string) => setForm((p) => ({ ...p, [field]: v })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentName.trim() || !form.phone.trim()) {
      toast.error("Student name and phone are required");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/leads/public/direct-admission", {
        studentName: form.studentName,
        phone: form.phone,
        fatherName: form.fatherName || undefined,
        email: form.email || undefined,
        dateOfBirth: form.dateOfBirth
          ? new Date(form.dateOfBirth).toISOString()
          : undefined,
        gender: form.gender || undefined,
        maritalStatus: form.maritalStatus || undefined,
        course: form.course || undefined,
        aadharNo: form.aadharNo || undefined,
        apaarId: form.apaarId || undefined,
        motherName: form.motherName || undefined,
        motherOccupation: form.motherOccupation || undefined,
        motherIncome: form.motherIncome ? Number(form.motherIncome) : undefined,
        fatherOccupation: form.fatherOccupation || undefined,
        fatherIncome: form.fatherIncome ? Number(form.fatherIncome) : undefined,
        noOfSisters: form.noOfSisters ? Number(form.noOfSisters) : undefined,
        noOfBrothers: form.noOfBrothers ? Number(form.noOfBrothers) : undefined,
        nationality: form.nationality || undefined,
        religion: form.religion || undefined,
        category: form.category || undefined,
        postalAddress: form.postalAddress || undefined,
        city: form.city || undefined,
        district: form.district || undefined,
        state: form.state || undefined,
        permanentAddress: form.permanentAddress || undefined,
        permanentPhone: form.permanentPhone || undefined,
        localGuardianName: form.localGuardianName || undefined,
        localGuardianAddress: form.localGuardianAddress || undefined,
        localGuardianPhone: form.localGuardianPhone || undefined,
        bookingAmount: form.bookingAmount
          ? Number(form.bookingAmount)
          : undefined,
        bookingCashDDNo: form.bookingCashDDNo || undefined,
        bookingBank: form.bookingBank || undefined,
        bookingDate: form.bookingDate
          ? new Date(form.bookingDate).toISOString()
          : undefined,
        admissionAmount: form.admissionAmount
          ? Number(form.admissionAmount)
          : undefined,
        admissionCashDDNo: form.admissionCashDDNo || undefined,
        admissionBank: form.admissionBank || undefined,
        admissionDate: form.admissionDate
          ? new Date(form.admissionDate).toISOString()
          : undefined,
        duesAmount: form.duesAmount ? Number(form.duesAmount) : undefined,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : undefined,
        extraCurricular: form.extraCurricular || undefined,
        authorisedBy: form.authorisedBy || undefined,
        remarks: form.remarks || undefined,
      });

      const leadId = data.data.leadId as string;

      const academicRecords = Object.entries(academic)
        .filter(([, r]) => r.institution || r.board || r.percentage)
        .map(([level, r]) => ({
          level,
          stream: r.stream || undefined,
          institution: r.institution || undefined,
          board: r.board || undefined,
          passingYear: r.passingYear ? Number(r.passingYear) : undefined,
          percentage: r.percentage ? Number(r.percentage) : undefined,
          grade: r.grade || undefined,
        }));
      if (academicRecords.length > 0) {
        await api.post(`/leads/${leadId}/confirmed/academic`, {
          records: academicRecords,
        });
      }

      const examRecords = exams
        .filter((e) => e.examName)
        .map((e) => ({
          examName: e.examName,
          rollNo: e.rollNo || undefined,
          score: e.score || undefined,
          rank: e.rank ? Number(e.rank) : undefined,
        }));
      if (examRecords.length > 0) {
        await api.post(`/leads/${leadId}/confirmed/exams`, {
          exams: examRecords,
        });
      }

      setSubmittedLeadId(leadId);
      toast.success("Direct admission submitted successfully");
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (submittedLeadId) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Admission Submitted</h2>
        <p className="text-sm text-gray-500">
          The direct admission has been created and confirmed successfully.
        </p>
        <p className="text-xs text-gray-400 font-mono bg-surface-50 border border-surface-200 rounded-lg px-4 py-2 inline-block">
          Ref: {submittedLeadId}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/leads/${submittedLeadId}`)}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-800 transition-colors"
          >
            View Lead
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setAcademic({
                TENTH: { ...emptyAcademic },
                TWELFTH: { ...emptyAcademic },
                GRADUATION: { ...emptyAcademic },
                POST_GRADUATION: { ...emptyAcademic },
              });
              setExams([{ examName: "", rollNo: "", score: "", rank: "" }]);
              setSubmittedLeadId(null);
            }}
            className="px-4 py-2 rounded-lg border border-surface-200 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors"
          >
            Add Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Direct Admission</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Fill in the admission application details below
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* Student Details */}
        <div className="bg-white border border-surface-200 rounded-xl p-6">
          <Section title="Student Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Student Name *"
                placeholder="Full name"
                {...f("studentName")}
              />
              <Field
                label="Phone *"
                placeholder="10-digit mobile"
                {...f("phone")}
              />
              <Field label="Email" type="email" {...f("email")} />
              <Field label="Date of Birth" type="date" {...f("dateOfBirth")} />
              <Field
                label="Course"
                placeholder="e.g. B.Tech CSE"
                {...f("course")}
              />
            </div>
          </Section>
        </div>

        <div className="bg-white border border-surface-200 rounded-xl p-6 space-y-6">
          {/* Identity Documents */}
          <Section title="Identity Documents">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Aadhar Number"
                placeholder="12-digit Aadhar"
                {...f("aadharNo")}
              />
              <Field
                label="Apaar / ABC ID"
                placeholder="Apaar ID"
                {...f("apaarId")}
              />
            </div>
          </Section>

          <hr className="border-surface-200" />

          {/* Personal Details */}
          <Section title="Personal Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label="Gender"
                {...f("gender")}
                options={[
                  { value: "MALE", label: "Male" },
                  { value: "FEMALE", label: "Female" },
                  { value: "OTHER", label: "Other" },
                ]}
              />
              <SelectField
                label="Marital Status"
                {...f("maritalStatus")}
                options={[
                  { value: "SINGLE", label: "Single" },
                  { value: "MARRIED", label: "Married" },
                ]}
              />
            </div>
          </Section>

          <hr className="border-surface-200" />

          {/* Family Background */}
          <Section title="Family Background">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-surface-100">
                <Field
                  label="Father's Name"
                  placeholder="Father's full name"
                  {...f("fatherName")}
                />
                <Field
                  label="Father's Occupation"
                  {...f("fatherOccupation")}
                />
                <Field
                  label="Father's Annual Income (₹)"
                  type="number"
                  {...f("fatherIncome")}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-surface-100">
                <Field label="Mother's Name" {...f("motherName")} />
                <Field
                  label="Mother's Occupation"
                  {...f("motherOccupation")}
                />
                <Field
                  label="Mother's Annual Income (₹)"
                  type="number"
                  {...f("motherIncome")}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="No. of Sisters"
                    type="number"
                    {...f("noOfSisters")}
                  />
                  <Field
                    label="No. of Brothers"
                    type="number"
                    {...f("noOfBrothers")}
                  />
                </div>
                <Field label="Nationality" {...f("nationality")} />
                <Field label="Religion" {...f("religion")} />
                <Field
                  label="Category"
                  placeholder="General / OBC / SC / ST"
                  {...f("category")}
                />
              </div>
            </div>
          </Section>

          <hr className="border-surface-200" />

          {/* Addresses */}
          <Section title="Addresses">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="City" {...f("city")} />
                <Field label="District" {...f("district")} />
                <Field label="State" {...f("state")} />
              </div>
              <Field
                label="Postal Address"
                textarea
                placeholder="Current / postal address"
                {...f("postalAddress")}
              />
              <Field
                label="Permanent Address"
                textarea
                {...f("permanentAddress")}
              />
              <Field label="Permanent Phone" {...f("permanentPhone")} />
              <Field
                label="Local Guardian's Name"
                {...f("localGuardianName")}
              />
              <Field
                label="Local Guardian's Phone"
                {...f("localGuardianPhone")}
              />
              <Field
                label="Local Guardian's Address"
                textarea
                {...f("localGuardianAddress")}
              />
            </div>
          </Section>
        </div>

        {/* Academic Record */}
        <div className="bg-white border border-surface-200 rounded-xl p-6">
          <Section title="Academic Record">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
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
                        className="px-3 py-2 text-left font-semibold text-gray-500 border border-surface-200"
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
                        <td className="px-3 py-2 border border-surface-200 font-medium text-gray-700 whitespace-nowrap bg-surface-50">
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
                              type={
                                field === "passingYear" ||
                                field === "percentage"
                                  ? "number"
                                  : "text"
                              }
                              onChange={(e) =>
                                setAcademic((p) => ({
                                  ...p,
                                  [key]: {
                                    ...p[key]!,
                                    [field]: e.target.value,
                                  },
                                }))
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
        </div>

        {/* Entrance Exams */}
        <div className="bg-white border border-surface-200 rounded-xl p-6">
          <Section title="Entrance Exams (if applicable)">
            <div className="space-y-3">
              {exams.map((exam, i) => (
                <div key={i} className="grid grid-cols-4 gap-3 items-end">
                  <div>
                    {i === 0 && (
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Exam Name
                      </label>
                    )}
                    <input
                      type="text"
                      title="Exam Name"
                      placeholder="e.g. JEE Main"
                      value={exam.examName}
                      onChange={(e) => {
                        const n = [...exams];
                        n[i] = { ...n[i]!, examName: e.target.value };
                        setExams(n);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    {i === 0 && (
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Roll No.
                      </label>
                    )}
                    <input
                      type="text"
                      title="Roll No."
                      value={exam.rollNo}
                      onChange={(e) => {
                        const n = [...exams];
                        n[i] = { ...n[i]!, rollNo: e.target.value };
                        setExams(n);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    {i === 0 && (
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Score
                      </label>
                    )}
                    <input
                      type="text"
                      title="Score"
                      value={exam.score}
                      onChange={(e) => {
                        const n = [...exams];
                        n[i] = { ...n[i]!, score: e.target.value };
                        setExams(n);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      {i === 0 && (
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Rank
                        </label>
                      )}
                      <input
                        type="number"
                        title="Rank"
                        value={exam.rank}
                        onChange={(e) => {
                          const n = [...exams];
                          n[i] = { ...n[i]!, rank: e.target.value };
                          setExams(n);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    {exams.length > 1 && (
                      <button
                        type="button"
                        title="Remove exam"
                        onClick={() =>
                          setExams(exams.filter((_, j) => j !== i))
                        }
                        className="mb-0.5 p-2 text-gray-400 hover:text-red-500 rounded-lg border border-surface-200"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
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
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus size={12} /> Add another exam
              </button>
            </div>
          </Section>
        </div>

        {/* Payment Details */}
        <div className="bg-white border border-surface-200 rounded-xl p-6">
          <Section title="Payment Details (Office Use)">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Booking Amount (₹)"
                type="number"
                {...f("bookingAmount")}
              />
              <Field label="Cash/DD No." {...f("bookingCashDDNo")} />
              <Field label="Bank" {...f("bookingBank")} />
              <Field label="Booking Date" type="date" {...f("bookingDate")} />
              <Field
                label="Admission Amount (₹)"
                type="number"
                {...f("admissionAmount")}
              />
              <Field label="Cash/DD No." {...f("admissionCashDDNo")} />
              <Field label="Bank" {...f("admissionBank")} />
              <Field
                label="Admission Date"
                type="date"
                {...f("admissionDate")}
              />
              <Field
                label="Dues Amount (₹)"
                type="number"
                {...f("duesAmount")}
              />
              <Field label="Due Date" type="date" {...f("dueDate")} />
            </div>
          </Section>
        </div>

        {/* Other Details */}
        <div className="bg-white border border-surface-200 rounded-xl p-6">
          <Section title="Other Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Extra Curricular Activities"
                {...f("extraCurricular")}
              />
              <Field label="Authorised By" {...f("authorisedBy")} />
              <div className="sm:col-span-2">
                <Field label="Remarks" textarea {...f("remarks")} />
              </div>
            </div>
          </Section>
        </div>

        <div className="flex justify-end pb-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-800 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {saving ? "Submitting..." : "Submit Direct Admission"}
          </button>
        </div>
      </form>
    </div>
  );
}
