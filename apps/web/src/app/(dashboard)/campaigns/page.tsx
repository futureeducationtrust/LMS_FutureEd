"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Megaphone,
  Search,
  Users,
  Play,
  Pencil,
  Archive,
  ArchiveRestore,
  UserPlus,
  ChevronDown,
  X,
  MoreHorizontal,
  ListFilter,
  Layers,
  Clock,
  UserX,
} from "lucide-react";
import { Role } from "@lms/types";
import { useAuthStore } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import {
  useCampaignList,
  useAssignCampaign,
  useUpdateCampaign,
  type CampaignFilters,
  type CampaignRow,
} from "@/hooks/useCampaigns";
import { useAssignableUsers } from "@/hooks/useLeads";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, extractApiError } from "@/lib/utils";

dayjs.extend(relativeTime);

type StatusFilter = NonNullable<CampaignFilters["status"]>;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const SORT_OPTIONS: Array<{ value: NonNullable<CampaignFilters["sortBy"]>; label: string }> = [
  { value: "createdAt", label: "Newest" },
  { value: "name", label: "Name" },
  { value: "leadCount", label: "Most leads" },
  { value: "progress", label: "Progress" },
];

// ── Progress ring (TeleCRM shows a donut per campaign) ───────────────────
function ProgressRing({ value, size = 44 }: { value: number; size?: number }) {
  const pct = Math.round(value * 100);
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const done = pct === 100;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-surface-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          className={done ? "text-green-500" : "text-primary"}
        />
      </svg>
      <span className={cn("text-sm font-semibold tabular-nums", done ? "text-green-600" : "text-gray-800")}>{pct}%</span>
    </div>
  );
}

function AssigneeAvatars({ assignees }: { assignees: CampaignRow["assignees"] }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex -space-x-2 shrink-0">
        {assignees.slice(0, 4).map((a) => (
          <span
            key={a.id}
            title={a.name}
            className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center ring-2 ring-white"
          >
            {a.name.slice(0, 2).toUpperCase()}
          </span>
        ))}
        {assignees.length > 4 && (
          <span className="w-7 h-7 rounded-full bg-surface-200 text-gray-600 text-[11px] font-semibold flex items-center justify-center ring-2 ring-white">
            +{assignees.length - 4}
          </span>
        )}
      </div>
      <span className="text-xs text-gray-600 truncate">
        {assignees.map((a) => a.name.split(" ")[0]).join(", ")}
      </span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone?: "warn" | undefined }) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", tone === "warn" ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary")}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
        <p className="text-[11px] uppercase tracking-wide text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Assign modal ─────────────────────────────────────────────────────────
function AssignModal({ campaign, onClose }: { campaign: CampaignRow; onClose: () => void }) {
  const { data: users = [], isLoading } = useAssignableUsers();
  const [selected, setSelected] = useState<string[]>(campaign.assignees.map((a) => a.id));
  const assign = useAssignCampaign();
  const { success, error } = useNotifications();

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit() {
    try {
      const r = await assign.mutateAsync({ id: campaign.id, userIds: selected });
      success(
        "Campaign assigned",
        `${r.assigned} lead${r.assigned === 1 ? "" : "s"} across ${selected.length} employee${selected.length === 1 ? "" : "s"}`,
      );
      onClose();
    } catch (e) {
      error("Assignment failed", extractApiError(e));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Assign "${campaign.name}"`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={assign.isPending} disabled={selected.length === 0}>
            Assign {campaign.leadCount} lead{campaign.leadCount === 1 ? "" : "s"}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-gray-600 mb-3">
        <strong>All {campaign.leadCount} leads</strong> in this campaign will be split evenly across the employees you
        pick, replacing any current assignee. Confirmed admissions are left as they are.
      </p>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-surface-100 border border-surface-200 rounded-lg">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-50">
              <input type="checkbox" className="accent-primary" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">
                {u.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-sm text-gray-800 flex-1">{u.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">{u.role.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      )}
      {selected.length > 0 && campaign.leadCount > 0 && (
        <p className="text-xs text-gray-500 mt-2">≈ {Math.ceil(campaign.leadCount / selected.length)} leads each</p>
      )}
    </Modal>
  );
}

// ── Rename modal ─────────────────────────────────────────────────────────
function RenameModal({ campaign, onClose }: { campaign: CampaignRow; onClose: () => void }) {
  const [name, setName] = useState(campaign.name);
  const update = useUpdateCampaign();
  const { success, error } = useNotifications();

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === campaign.name) return onClose();
    try {
      await update.mutateAsync({ id: campaign.id, name: trimmed });
      success("Campaign renamed", trimmed);
      onClose();
    } catch (e) {
      error("Rename failed", extractApiError(e));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Rename campaign"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={update.isPending}>Save</Button>
        </div>
      }
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus onKeyDown={(e) => e.key === "Enter" && submit()} />
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuthStore();
  const isManager = user?.role === Role.ADMIN || user?.role === Role.SUB_ADMIN;
  const { success, error } = useNotifications();
  const { data: users = [] } = useAssignableUsers();

  // Filters live in the URL so a view is shareable and survives refresh.
  const filters: CampaignFilters = useMemo(
    () => ({
      page: Number(sp.get("page") ?? 1),
      pageSize: Number(sp.get("pageSize") ?? 20),
      search: sp.get("search") ?? "",
      status: (sp.get("status") as StatusFilter) ?? "active",
      assigneeId: sp.get("assigneeId") ?? "",
      dateFrom: sp.get("dateFrom") ?? "",
      dateTo: sp.get("dateTo") ?? "",
      sortBy: (sp.get("sortBy") as CampaignFilters["sortBy"]) ?? "createdAt",
      sortOrder: (sp.get("sortOrder") as CampaignFilters["sortOrder"]) ?? "desc",
    }),
    [sp],
  );

  function setFilter(patch: Partial<CampaignFilters>) {
    const next = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === null) next.delete(k);
      else next.set(k, String(v));
    });
    if (!("page" in patch)) next.delete("page");
    router.replace(`/campaigns?${next.toString()}`);
  }

  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");
  const { data, isLoading } = useCampaignList(filters);
  const update = useUpdateCampaign();
  const [assigning, setAssigning] = useState<CampaignRow | null>(null);
  const [renaming, setRenaming] = useState<CampaignRow | null>(null);

  async function toggleArchive(c: CampaignRow) {
    try {
      await update.mutateAsync({ id: c.id, isArchived: !c.isArchived });
      success(c.isArchived ? "Campaign restored" : "Campaign archived", c.name);
    } catch (e) {
      error("Update failed", extractApiError(e));
    }
  }

  const activeFilterCount =
    (filters.search ? 1 : 0) + (filters.assigneeId ? 1 : 0) + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);
  const showPagination = !!data && (data.totalPages > 1 || data.total > 20);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone size={20} className="text-primary" /> Campaigns
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isManager
              ? "Your calling lists, one per Excel import. Assign a campaign and every lead in it is split across the team."
              : "Campaigns assigned to you. Open one to work its leads one at a time."}
          </p>
        </div>
        {isManager && (
          <Link href="/import">
            <Button size="sm">Import leads</Button>
          </Link>
        )}
      </div>

      {/* Summary strip — totals over the whole filtered set */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile icon={Layers} label="Campaigns" value={data.summary.campaigns} />
          <StatTile icon={Users} label="Leads in campaigns" value={data.summary.leads} />
          <StatTile icon={Clock} label="Still to call" value={data.summary.remaining} />
          <StatTile icon={UserX} label="Unassigned campaigns" value={data.summary.unassignedCampaigns} tone={data.summary.unassignedCampaigns > 0 ? "warn" : undefined} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-surface-200 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setFilter({ search: searchDraft })}
              onBlur={() => searchDraft !== filters.search && setFilter({ search: searchDraft })}
              placeholder="Search campaign or file name…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex rounded-lg border border-surface-200 overflow-hidden">
            {STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setFilter({ status: o.value })}
                className={cn(
                  "px-3 py-2 text-xs font-medium",
                  filters.status === o.value ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-surface-50",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {isManager && (
            <select
              value={filters.assigneeId ?? ""}
              onChange={(e) => setFilter({ assigneeId: e.target.value })}
              aria-label="Filter by assignee"
              className="py-2 px-3 text-sm border border-surface-200 rounded-lg bg-white"
            >
              <option value="">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}

          <input type="date" value={filters.dateFrom ?? ""} onChange={(e) => setFilter({ dateFrom: e.target.value })} aria-label="Created from" className="py-2 px-3 text-sm border border-surface-200 rounded-lg bg-white" />
          <input type="date" value={filters.dateTo ?? ""} onChange={(e) => setFilter({ dateTo: e.target.value })} aria-label="Created to" className="py-2 px-3 text-sm border border-surface-200 rounded-lg bg-white" />

          <div className="relative">
            <select
              value={`${filters.sortBy}:${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split(":") as [NonNullable<CampaignFilters["sortBy"]>, NonNullable<CampaignFilters["sortOrder"]>];
                setFilter({ sortBy, sortOrder });
              }}
              aria-label="Sort"
              className="py-2 pl-3 pr-8 text-sm border border-surface-200 rounded-lg bg-white appearance-none"
            >
              {SORT_OPTIONS.flatMap((o) => [
                <option key={`${o.value}:desc`} value={`${o.value}:desc`}>{o.label} ↓</option>,
                <option key={`${o.value}:asc`} value={`${o.value}:asc`}>{o.label} ↑</option>,
              ])}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSearchDraft(""); setFilter({ search: "", assigneeId: "", dateFrom: "", dateTo: "" }); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-2"
            >
              <X size={12} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><Spinner /></div>
        ) : !data || data.campaigns.length === 0 ? (
          <EmptyState
            icon={<ListFilter size={28} />}
            title={filters.status === "active" && activeFilterCount === 0 ? "No active campaigns" : "No campaigns match"}
            description={isManager ? "Import an Excel file — each import becomes a campaign named after the file." : "Nothing has been assigned to you yet."}
            {...(isManager ? { action: { label: "Import leads", onClick: () => router.push("/import") } } : {})}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50 text-left">
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right w-28">Leads</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-36">Progress</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Assignees</th>
                    <th className="px-4 py-2.5 w-px" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {data.campaigns.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/campaigns/${c.id}/work`)}
                      className={cn("group cursor-pointer hover:bg-surface-50 transition-colors", c.isArchived && "opacity-60")}
                    >
                      {/* Campaign: name, file, created */}
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Megaphone size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-primary">{c.name}</p>
                            <p className="text-[11px] text-gray-400 truncate" title={c.sourceFile ?? undefined}>
                              {c.sourceFile && c.sourceFile !== c.name ? `${c.sourceFile} · ` : ""}
                              <span title={dayjs(c.createdAt).format("D MMM YYYY, h:mm A")}>{dayjs(c.createdAt).fromNow()}</span>
                              {" by "}{c.createdBy.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Leads: total + remaining */}
                      <td className="px-4 py-3 align-middle text-right">
                        <p className="text-base font-semibold text-gray-900 tabular-nums leading-tight">{c.leadCount}</p>
                        <p className={cn("text-[11px] tabular-nums", c.newCount > 0 ? "text-amber-600" : "text-green-600")}>
                          {c.newCount > 0 ? `${c.newCount} to call` : c.leadCount > 0 ? "all called" : "empty"}
                        </p>
                      </td>

                      <td className="px-4 py-3 align-middle"><ProgressRing value={c.progress} /></td>

                      {/* Assignees: avatars, or the primary next action */}
                      <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        {c.assignees.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <AssigneeAvatars assignees={c.assignees} />
                            {c.unassignedCount > 0 && (
                              <span className="text-[11px] text-amber-600 whitespace-nowrap">{c.unassignedCount} unassigned</span>
                            )}
                          </div>
                        ) : isManager ? (
                          <button
                            onClick={() => setAssigning(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100"
                          >
                            <UserPlus size={13} /> Assign to team
                          </button>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/campaigns/${c.id}/work`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-800"
                          >
                            <Play size={12} /> Work
                          </Link>
                          {isManager && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded-lg text-gray-500 hover:bg-surface-100" aria-label="More actions">
                                  <MoreHorizontal size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setAssigning(c)}><UserPlus size={14} /> {c.assignees.length ? "Change assignees" : "Assign to team"}</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setRenaming(c)}><Pencil size={14} /> Rename</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => router.push(`/leads?campaignId=${c.id}`)}><Users size={14} /> View leads in Leads</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => void toggleArchive(c)}>
                                  {c.isArchived ? <><ArchiveRestore size={14} /> Restore</> : <><Archive size={14} /> Archive</>}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {showPagination && (
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                totalPages={data.totalPages}
                onPageChange={(page) => setFilter({ page })}
                onPageSizeChange={(pageSize) => setFilter({ pageSize })}
              />
            )}
          </>
        )}
      </div>

      {assigning && <AssignModal campaign={assigning} onClose={() => setAssigning(null)} />}
      {renaming && <RenameModal campaign={renaming} onClose={() => setRenaming(null)} />}
    </div>
  );
}
