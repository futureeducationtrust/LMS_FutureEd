"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useActivityFeed } from "@/hooks/useDashboard";

dayjs.extend(relativeTime);

interface ActivityItem {
  id?: string;
  type?: string;
  user?: { name?: string } | null;
  lead?: { studentName?: string } | null;
  statusAfter?: string | null;
  createdAt?: string | Date | null;
}

interface ActivityFeedData {
  interactions?: ActivityItem[];
}

function buildActivityText(item: ActivityItem): string {
  const actor = item.user?.name ?? "Someone";
  const student = item.lead?.studentName ?? "a student";

  switch (item.type) {
    case "STATUS_CHANGED":
      return `${actor} moved ${student} → ${item.statusAfter?.replace(/_/g, " ")}`;
    case "CALL":
      return `${actor} logged a call with ${student}`;
    case "NOTE":
      return `${actor} added a note on ${student}`;
    case "DOCUMENT_UPLOADED":
      return `${actor} uploaded a document for ${student}`;
    default:
      return `${actor} updated ${student}`;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Deterministic color per user
const COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

function userColor(name: string): string {
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx] ?? COLORS[0]!;
}

export function ActivityFeed() {
  const { data, isLoading } = useActivityFeed();
  const interactions =
    (data as ActivityFeedData | undefined)?.interactions ?? [];

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5 h-full">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        Activity Feed
      </h3>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-surface-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-surface-200 rounded w-4/5" />
                <div className="h-3 bg-surface-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : interactions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No recent activity
        </p>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-96">
          {interactions.map((item: ActivityItem) => (
            <div key={item.id} className="flex gap-3">
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${userColor(item.user?.name ?? "U")}`}
              >
                {getInitials(item.user?.name ?? "U")}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 leading-relaxed">
                  {buildActivityText(item)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {dayjs(item.createdAt).fromNow()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
