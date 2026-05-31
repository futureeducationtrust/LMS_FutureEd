"use client";

import { useState } from "react";
import { Users, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import { StatCard } from "./StatCard";
import { PipelineChart } from "./PipelineChart";
import { ActivityFeed } from "./ActivityFeed";
import { EmployeePerformanceTable } from "./EmployeePerformanceTable";
import { FollowUpsDueToday } from "./FollowUpsDueToday";
import { LeadSourcesChart } from "./LeadSourcesChart";
import { TrendChart } from "./TrendChart";
import { PeriodSelector } from "./PeriodSelector";
import { useDashboardOverview } from "@/hooks/useDashboard";
import type { Period } from "@/hooks/useDashboard";

// Minimal summary shape returned by the dashboard hook — keep in-file to avoid
// importing broad types and to remove usage of `any`.
type DashboardSummary = {
  totalLeadsInPeriod?: number;
  newToday?: number;
  overdueCount?: number;
  totalActiveLeads?: number;
  conversionRate?: number;
};

export function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("last30");
  const { data, isLoading } = useDashboardOverview(period);
  // data may be typed as an empty object by the hook; narrow it to a local shape for summary access
  const summary = (data as { summary?: DashboardSummary } | undefined)?.summary;

  return (
    <div className="space-y-6">
      {/* Period selector for stat cards */}
      <div className="flex items-center justify-between">
        <div />
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Leads"
          value={summary?.totalLeadsInPeriod ?? 0}
          subtitle="vs last period"
          icon={<Users size={16} className="text-primary" />}
          loading={isLoading}
          href="/leads"
        />
        <StatCard
          title="Confirmed Today"
          value={summary?.newToday ?? 0}
          subtitle="new today"
          icon={<CheckCircle2 size={16} className="text-green-600" />}
          iconBg="bg-green-50"
          loading={isLoading}
          href="/admissions"
        />
        <StatCard
          title="Pending Follow-ups"
          value={summary?.overdueCount ?? 0}
          subtitle="need action"
          icon={<AlertTriangle size={16} className="text-amber-600" />}
          iconBg="bg-amber-50"
          loading={isLoading}
          href="/leads?overdue=true"
        />
        <StatCard
          title="Leads This Month"
          value={summary?.totalActiveLeads ?? 0}
          subtitle="active"
          icon={<TrendingUp size={16} className="text-indigo-600" />}
          iconBg="bg-indigo-50"
          loading={isLoading}
          href="/leads"
        />
        <StatCard
          title="Conversion Rate"
          value={`${summary?.conversionRate ?? 0}%`}
          subtitle="this period"
          icon={<CheckCircle2 size={16} className="text-primary" />}
          loading={isLoading}
          href="/admissions"
        />
      </div>

      {/* Pipeline + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineChart />
        </div>
        <ActivityFeed />
      </div>

      {/* Employee performance + Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EmployeePerformanceTable />
        </div>
        <FollowUpsDueToday />
      </div>

      {/* Sources + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadSourcesChart />
        <TrendChart />
      </div>
    </div>
  );
}
