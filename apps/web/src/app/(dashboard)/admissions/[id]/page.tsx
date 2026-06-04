"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLeadDetail } from "@/hooks/useLeadDetail";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmedApplicationTab } from "@/components/leads/ConfirmedApplicationTab";
import { LeadStatus } from "@lms/types";

export default function AdmissionFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: lead, isLoading } = useLeadDetail(id);

  if (isLoading) {
    return (
      <div className="py-12">
        <Spinner />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Lead not found</p>
        <Link
          href="/admissions"
          className="text-primary text-sm mt-2 block hover:underline"
        >
          Back to admissions
        </Link>
      </div>
    );
  }

  const isConfirmed = lead.status === LeadStatus.CONFIRMED;

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft size={14} />
          Back to admissions
        </button>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Admission Application
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {lead.studentName} ·{" "}
              {isConfirmed ? "Read only" : "Fill and confirm"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl p-6">
        <ConfirmedApplicationTab
          leadId={id}
          leadData={lead}
          leadStatus={lead.status}
          mode={isConfirmed ? "view" : "edit"}
          confirmOnSave={!isConfirmed}
        />
      </div>
    </div>
  );
}
