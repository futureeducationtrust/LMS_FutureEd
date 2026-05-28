"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { useAuthStore } from "@/store/auth";
import { Role } from "@lms/types";
import { formatTimeAgo } from "@/lib/utils";

export default function AdmissionsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admissions-leads", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "INTERESTED",
        page: String(page),
        pageSize: "20",
      });
      if (search) params.set("search", search);
      const { data } = await api.get(`/leads?${params.toString()}`);
      return data.data as {
        leads: any[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    },
    refetchInterval: 30_000,
  });

  const leads = data?.leads ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Interested leads ready for admission processing
            {data && ` · ${data.total} total`}
          </p>
        </div>
        <button
          type="button"
          title="Refresh"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="p-2 rounded-lg border border-surface-200 text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl p-4">
        <div className="relative max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            placeholder="Search by name, phone, father name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="No interested leads"
          description="Leads with INTERESTED status will appear here for admission processing"
        />
      ) : (
        <>
          <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  {[
                    "Student",
                    "Phone",
                    "Course",
                    ...(user?.role !== Role.EMPLOYEE ? ["Counsellor"] : []),
                    "Added",
                    "Form Status",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {leads.map((lead: any) => {
                  const hasForm = lead.confirmedApplication != null;
                  const isSent =
                    lead.confirmedApplication?.sentToStudentAt != null;
                  const isComplete =
                    lead.confirmedApplication?.isFormComplete === true;

                  return (
                    <tr key={lead.id} className="hover:bg-surface-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">
                          {lead.studentName}
                        </p>
                        {lead.fatherName && (
                          <p className="text-xs text-gray-400">
                            Father: {lead.fatherName}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {lead.phone}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {lead.courses?.find((c: any) => c.isPrimary)?.course
                          ?.name ?? "—"}
                      </td>
                      {user?.role !== Role.EMPLOYEE && (
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {lead.assignedTo?.name ?? (
                            <span className="text-amber-600">Unassigned</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatTimeAgo(lead.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {isSent ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Sent
                          </span>
                        ) : isComplete ? (
                          <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Ready to send
                          </span>
                        ) : hasForm ? (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            In progress
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-gray-300" />
                            Not started
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-800 transition-colors"
                        >
                          {hasForm ? "Open Form" : "Start Form"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </>
      )}
    </div>
  );
}
