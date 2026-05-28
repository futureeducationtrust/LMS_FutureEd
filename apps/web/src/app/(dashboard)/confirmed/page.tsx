"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Search, RefreshCw, Mail } from "lucide-react";
import api from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { useAuthStore } from "@/store/auth";
import { Role } from "@lms/types";
import { formatDate, formatTimeAgo } from "@/lib/utils";

export default function ConfirmedLeadsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["confirmed-leads", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "CONFIRMED",
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
    refetchInterval: 60_000,
  });

  const leads = data?.leads ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Confirmed Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Leads whose admission application has been sent
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
            placeholder="Search by name, phone..."
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
          icon={<CheckCircle2 size={24} />}
          title="No confirmed leads yet"
          description="Leads whose admission application has been sent will appear here"
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
                    "Sent On",
                    "Email",
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
                  const sentAt = lead.confirmedApplication?.sentToStudentAt;
                  const sentTo = lead.confirmedApplication?.sentToStudentEmail;

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
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {sentAt ? (
                          <span title={formatDate(sentAt)}>
                            {formatTimeAgo(sentAt)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sentTo ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <Mail size={11} />
                            {sentTo}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No email
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="px-3 py-1.5 rounded-lg border border-surface-200 text-gray-600 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
                        >
                          View Lead
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
