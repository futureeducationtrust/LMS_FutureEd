"use client";

import { useState } from "react";
import { useEmployeePerformance } from "@/hooks/useDashboard";
import { PeriodSelector } from "./PeriodSelector";
import type { Period } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

export function EmployeePerformanceTable() {
  const [period, setPeriod] = useState<Period>("last30");
  const { data, isLoading } = useEmployeePerformance(period);

  type EmployeeRow = {
    employee: { id: string; name: string };
    metrics: {
      performanceScore: number;
      totalAssigned: number;
      confirmed: number;
      lost: number;
      confirmationRate: number;
    };
  };

  const employees: EmployeeRow[] = Array.isArray(
    (data as { employees?: unknown })?.employees,
  )
    ? ((data as { employees?: EmployeeRow[] }).employees ?? [])
    : [];

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">
          Employee Performance
        </h3>
        <PeriodSelector value={period} onChange={setPeriod} compact />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-surface-100 rounded animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                {[
                  "Employee",
                  "Leads",
                  "Confirmed",
                  "Lost",
                  "Conv %",
                  "Score",
                ].map((h) => (
                  <th
                    key={h}
                    className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {employees.map(
                (emp: (typeof employees)[number], _idx: number) => {
                  const score = emp.metrics.performanceScore;
                  const scoreColor =
                    score >= 70
                      ? "text-green-600"
                      : score >= 40
                        ? "text-amber-600"
                        : "text-red-500";

                  return (
                    <tr key={emp.employee.id} className="hover:bg-surface-50">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {emp.employee.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {emp.employee.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-sm text-gray-600">
                        {emp.metrics.totalAssigned}
                      </td>
                      <td className="py-2.5 text-sm font-semibold text-green-600">
                        {emp.metrics.confirmed}
                      </td>
                      <td className="py-2.5 text-sm text-red-500">
                        {emp.metrics.lost}
                      </td>
                      <td className="py-2.5 text-sm font-semibold text-gray-700">
                        {emp.metrics.confirmationRate}%
                      </td>
                      <td className="py-2.5">
                        <span className={cn("text-sm font-bold", scoreColor)}>
                          {score}
                        </span>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>

          {employees.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">
              No employee data for this period
            </p>
          )}
        </div>
      )}
    </div>
  );
}
