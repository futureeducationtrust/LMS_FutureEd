"use client";

import { useRef, useState } from "react";
import { Download, Save, Upload, FileText, Check, Eye, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useConfirmedApplication,
  useUpdateConfirmedApplication,
} from "@/hooks/useLeadDetail";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { extractApiError } from "@/lib/utils";

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

function DocumentUploadSection({
  confirmedApplicationId,
  leadId,
  documents,
}: {
  confirmedApplicationId: string;
  leadId: string;
  documents: Document[];
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: docTypes } = useQuery({
    queryKey: ["document-types"],
    queryFn: async () => {
      const { data } = await api.get("/settings/documents");
      return data.data as Array<{
        id: string;
        name: string;
        isRequired: boolean;
      }>;
    },
    staleTime: 5 * 60_000,
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedTypeId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data: uploadData } = await api.post(
        "/upload/document",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      await api.post(`/leads/${leadId}/confirmed/documents`, {
        documentTypeId: selectedTypeId,
        fileUrl: uploadData.data.url,
        fileName: file.name,
        confirmedApplicationId,
      });

      toast.success("Document uploaded successfully");
      void qc.invalidateQueries({ queryKey: ["confirmed", leadId] });
      setSelectedTypeId("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      toast.error(extractApiError(error));
    } finally {
      setUploading(false);
    }
  }

  const uploadedTypeIds = new Set(
    documents.map((doc) => doc.documentType?.name).filter(Boolean),
  );
  const requiredDocTypes =
    docTypes?.filter((docType) => docType.isRequired) ?? [];
  const pendingRequired = requiredDocTypes.filter(
    (docType) => !uploadedTypeIds.has(docType.name),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Documents
        </p>
        {pendingRequired.length > 0 && (
          <Badge variant="warning">
            {pendingRequired.length} required pending
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <select
          value={selectedTypeId}
          onChange={(e) => setSelectedTypeId(e.target.value)}
          title="Select document type"
          className="flex-1 px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
        >
          <option value="">Select document type...</option>
          {docTypes?.map((docType) => (
            <option key={docType.id} value={docType.id}>
              {docType.name}
              {docType.isRequired ? " *" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => selectedTypeId && fileRef.current?.click()}
          disabled={!selectedTypeId || uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-800 disabled:opacity-50 transition-colors"
        >
          <Upload size={14} />
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/jpg,image/png"
          title="Upload document file"
          onChange={(event) => void handleUpload(event)}
          className="hidden"
        />
      </div>

      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg border border-surface-200"
            >
              <div className="w-8 h-8 bg-white rounded-lg border border-surface-200 flex items-center justify-center shrink-0">
                <FileText size={14} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {document.fileName}
                </p>
                <p className="text-xs text-gray-400">
                  {document.documentType?.name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {document.isVerified ? (
                  <Badge variant="success">
                    <Check size={10} className="mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning">Pending</Badge>
                )}
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-primary rounded-lg transition-colors"
                  title="View"
                >
                  <Eye size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          No documents uploaded yet
        </p>
      )}

      {requiredDocTypes.length > 0 && (
        <div className="p-3 bg-surface-50 rounded-lg border border-surface-200">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            Required Documents
          </p>
          <div className="space-y-1.5">
            {requiredDocTypes.map((docType) => {
              const uploaded = documents.some(
                (document) => document.documentType?.name === docType.name,
              );

              return (
                <div key={docType.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                      uploaded ? "bg-green-500" : "bg-surface-200",
                    )}
                  >
                    {uploaded && <Check size={10} className="text-white" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      uploaded
                        ? "text-green-700 line-through"
                        : "text-gray-600",
                    )}
                  >
                    {docType.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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

      {app?.id && (
        <DocumentUploadSection
          confirmedApplicationId={app.id}
          leadId={leadId}
          documents={app.documents as Document[]}
        />
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
