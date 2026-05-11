"use client";

import { useState } from "react";
import { Download, Save } from "lucide-react";
import {
  useConfirmedApplication,
  useUpdateConfirmedApplication,
} from "@/hooks/useLeadDetail";
import api from "@/lib/api";
import toast from "react-hot-toast";

type FormState = {
  aadharNo: string;
  apaarId: string;
  bookingAmount: string;
  admissionAmount: string;
  duesAmount: string;
  motherName: string;
  fatherOccupation: string;
  nationality: string;
  religion: string;
  category: string;
  permanentAddress: string;
  localGuardianName: string;
  authorisedBy: string;
};

type Document = {
  id: string;
  documentType: { name: string };
  fileName: string;
  isVerified: boolean;
  fileUrl: string;
};

function Field({
  label,
  field,
  type = "text",
  form,
  setForm,
}: {
  label: string;
  field: keyof FormState;
  type?: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        title={label}
        value={form[field]}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, [field]: e.target.value }))
        }
        className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

type Props = { leadId: string };

export function ConfirmedApplicationTab({ leadId }: Props) {
  const { data: app, isLoading } = useConfirmedApplication(leadId, true);
  const updateApp = useUpdateConfirmedApplication(leadId);

  const [form, setForm] = useState({
    aadharNo: "",
    apaarId: "",
    bookingAmount: "",
    admissionAmount: "",
    duesAmount: "",
    motherName: "",
    fatherOccupation: "",
    nationality: "",
    religion: "",
    category: "",
    permanentAddress: "",
    localGuardianName: "",
    authorisedBy: "",
  });

  // Sync form when data loads
  if (app && form.aadharNo === "" && app.aadharNo) {
    setForm({
      aadharNo: app.aadharNo ?? "",
      apaarId: app.apaarId ?? "",
      bookingAmount: String(app.bookingAmount ?? ""),
      admissionAmount: String(app.admissionAmount ?? ""),
      duesAmount: String(app.duesAmount ?? ""),
      motherName: app.motherName ?? "",
      fatherOccupation: app.fatherOccupation ?? "",
      nationality: app.nationality ?? "",
      religion: app.religion ?? "",
      category: app.category ?? "",
      permanentAddress: app.permanentAddress ?? "",
      localGuardianName: app.localGuardianName ?? "",
      authorisedBy: app.authorisedBy ?? "",
    });
  }

  async function handleSave() {
    await updateApp.mutateAsync({
      ...form,
      bookingAmount: form.bookingAmount
        ? Number(form.bookingAmount)
        : undefined,
      admissionAmount: form.admissionAmount
        ? Number(form.admissionAmount)
        : undefined,
      duesAmount: form.duesAmount ? Number(form.duesAmount) : undefined,
    });
  }

  async function handleExportPDF() {
    try {
      const response = await api.get(`/leads/${leadId}/confirmed/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admission-form.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-surface-100 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">
          Admission Assistance Form
        </h3>
        <button
          type="button"
          onClick={() => void handleExportPDF()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-200 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors"
        >
          <Download size={14} />
          Export PDF
        </button>
      </div>

      {/* Identity */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Identity Documents
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Aadhar Number"
            field="aadharNo"
            form={form}
            setForm={setForm}
          />
          <Field
            label="Apaar ID / ABC ID"
            field="apaarId"
            form={form}
            setForm={setForm}
          />
        </div>
      </div>

      {/* Payment */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Payment Details
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Booking Amount (₹)"
            field="bookingAmount"
            type="number"
            form={form}
            setForm={setForm}
          />
          <Field
            label="Admission Amount (₹)"
            field="admissionAmount"
            type="number"
            form={form}
            setForm={setForm}
          />
          <Field
            label="Dues Amount (₹)"
            field="duesAmount"
            type="number"
            form={form}
            setForm={setForm}
          />
        </div>
      </div>

      {/* Family */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Family Background
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Mother's Name"
            field="motherName"
            form={form}
            setForm={setForm}
          />
          <Field
            label="Father's Occupation"
            field="fatherOccupation"
            form={form}
            setForm={setForm}
          />
          <Field
            label="Nationality"
            field="nationality"
            form={form}
            setForm={setForm}
          />
          <Field
            label="Religion"
            field="religion"
            form={form}
            setForm={setForm}
          />
          <Field
            label="Category"
            field="category"
            form={form}
            setForm={setForm}
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Addresses
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Permanent Address
            </label>
            <textarea
              title="Enter permanent address"
              placeholder="Enter your permanent address"
              value={form.permanentAddress}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  permanentAddress: e.target.value,
                }))
              }
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none"
            />
          </div>
          <Field
            label="Local Guardian's Name"
            field="localGuardianName"
            form={form}
            setForm={setForm}
          />
        </div>
      </div>

      {/* Office use */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          For Office Use
        </p>
        <Field
          label="Authorised By"
          field="authorisedBy"
          form={form}
          setForm={setForm}
        />
      </div>

      {/* Documents list */}
      {app?.documents && app.documents.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Uploaded Documents
          </p>
          <div className="space-y-2">
            {app.documents.map((doc: Document) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-surface-50 rounded-lg border border-surface-200"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {doc.documentType.name}
                  </p>
                  <p className="text-xs text-gray-400">{doc.fileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.isVerified ? (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600">Pending</span>
                  )}
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-2 border-t border-surface-200">
        <button
          type="submit"
          onClick={() => void handleSave()}
          disabled={updateApp.isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-800 disabled:opacity-50 transition-colors"
        >
          <Save size={14} />
          {updateApp.isPending ? "Saving..." : "Save Application"}
        </button>
      </div>
    </div>
  );
}
