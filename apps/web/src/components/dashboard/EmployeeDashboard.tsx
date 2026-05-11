"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { StatCard } from "./StatCard";
import { FollowUpsDueToday } from "./FollowUpsDueToday";
import { ActivityFeed } from "./ActivityFeed";
import { PeriodSelector } from "./PeriodSelector";
import { useLeadList } from "@/hooks/useLeads";
import { StatusBadge } from "@/components/leads/StatusBadge";
import type { Period } from "@/hooks/useDashboard";
import type { LeadStatus } from "@lms/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function EmployeeDashboard() {
  const [period, setPeriod] = useState<Period>("last30");

  // Employee-specific stats — filter to their own leads
  const { data: myLeads } = useLeadList({
    pageSize: 5,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  // Calculate own stats from lead list
  const myTotal = myLeads?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div />
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Employee stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Leads"
          value={myTotal}
          subtitle="total assigned"
          icon={<Users size={16} className="text-primary" />}
        />
        <StatCard
          title="Confirmed"
          value={
            myLeads?.leads.filter((l) => l.status === "CONFIRMED").length ?? 0
          }
          subtitle="this period"
          icon={<CheckCircle2 size={16} className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Follow-ups Due"
          value={
            myLeads?.leads.filter(
              (l) =>
                l.nextFollowUpAt && new Date(l.nextFollowUpAt) <= new Date(),
            ).length ?? 0
          }
          subtitle="need action"
          icon={<Clock size={16} className="text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          title="My Conversion"
          value={
            myTotal > 0
              ? `${Math.round(
                  ((myLeads?.leads.filter((l) => l.status === "CONFIRMED")
                    .length ?? 0) /
                    myTotal) *
                    100,
                )}%`
              : "0%"
          }
          subtitle="confirmation rate"
          icon={<TrendingUp size={16} className="text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
      </div>

      {/* Recent leads + follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent leads */}
        <div className="lg:col-span-2 bg-white border border-surface-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">
              My Recent Leads
            </h3>
            <Link
              href="/leads"
              className="text-xs text-primary font-medium hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="space-y-3">
            {myLeads?.leads.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-surface-100 hover:border-primary-200 hover:bg-surface-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {lead.studentName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{lead.phone}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={lead.status as LeadStatus} size="sm" />
                  {lead.nextFollowUpAt && (
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {dayjs(lead.nextFollowUpAt).fromNow()}
                    </span>
                  )}
                </div>
              </Link>
            ))}

            {!myLeads?.leads.length && (
              <p className="text-center text-sm text-gray-400 py-6">
                No leads assigned yet
              </p>
            )}
          </div>
        </div>

        {/* Follow-ups */}
        <FollowUpsDueToday />
      </div>

      {/* Activity feed */}
      <ActivityFeed />
    </div>
  );
}
