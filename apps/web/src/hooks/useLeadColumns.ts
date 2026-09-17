"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Every column the leads table can show. `locked` columns are always first
// and can't be hidden; `managerOnly` columns are dropped for employees.
// Sorting is server-side and only exists for the keys the API accepts.
export type LeadColumnKey =
  | "studentName"
  | "phone"
  | "email"
  | "status"
  | "courses"
  | "assignedTo"
  | "source"
  | "campaign"
  | "city"
  | "district"
  | "fatherName"
  | "nextFollowUpAt"
  | "createdAt"
  | "updatedAt"
  | "confirmedAt"
  | "admissionId";

export type LeadColumnDef = {
  key: LeadColumnKey;
  label: string;
  sortable?: boolean;
  managerOnly?: boolean;
  locked?: boolean;
  type: "text" | "phone" | "email" | "status" | "date" | "user" | "tag";
};

export const LEAD_COLUMNS: LeadColumnDef[] = [
  { key: "studentName", label: "Student", sortable: true, locked: true, type: "text" },
  { key: "status", label: "Status", sortable: true, type: "status" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "courses", label: "Course", type: "tag" },
  { key: "assignedTo", label: "Counsellor", managerOnly: true, type: "user" },
  { key: "nextFollowUpAt", label: "Follow-up", sortable: true, type: "date" },
  { key: "createdAt", label: "Added", sortable: true, type: "date" },
  { key: "email", label: "Email", type: "email" },
  { key: "source", label: "Source", type: "tag" },
  { key: "campaign", label: "Campaign", type: "tag" },
  { key: "city", label: "City", type: "text" },
  { key: "district", label: "District", type: "text" },
  { key: "fatherName", label: "Father Name", type: "text" },
  { key: "updatedAt", label: "Modified", type: "date" },
  { key: "confirmedAt", label: "Confirmed On", type: "date" },
  { key: "admissionId", label: "Admission ID", type: "text" },
];

export const MAX_VISIBLE_COLUMNS = 12;

// The first seven mirror the table as it shipped, so nothing changes for
// anyone who never opens the chooser.
const DEFAULT_ORDER: LeadColumnKey[] = ["studentName", "status", "courses", "assignedTo", "nextFollowUpAt", "createdAt"];

const STORAGE_KEY = "lms.leads.columns.v1";

// localStorage exposed as an external store so the saved layout is read
// during render (no setState-in-effect), with a stable default on the
// server and first client paint to keep hydration clean.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function persist(value: string | null) {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {}
  listeners.forEach((l) => l());
}

function parse(raw: string | null): LeadColumnKey[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const valid = new Set(LEAD_COLUMNS.map((c) => c.key));
    const keys = parsed.filter((k): k is LeadColumnKey => typeof k === "string" && valid.has(k as LeadColumnKey));
    return keys.length ? keys : null;
  } catch {
    return null;
  }
}

function normalise(keys: LeadColumnKey[], isManager: boolean): LeadColumnKey[] {
  const seen = new Set<LeadColumnKey>();
  const out: LeadColumnKey[] = ["studentName"];
  seen.add("studentName");
  for (const k of keys) {
    const def = LEAD_COLUMNS.find((c) => c.key === k);
    if (!def || seen.has(k)) continue;
    if (def.managerOnly && !isManager) continue;
    out.push(k);
    seen.add(k);
    if (out.length >= MAX_VISIBLE_COLUMNS) break;
  }
  return out;
}

export function useLeadColumns(isManager: boolean) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const keys = useMemo(() => normalise(parse(raw) ?? DEFAULT_ORDER, isManager), [raw, isManager]);

  const update = useCallback(
    (next: LeadColumnKey[]) => persist(JSON.stringify(normalise(next, isManager))),
    [isManager],
  );

  const reset = useCallback(() => persist(null), []);

  const columns = keys.map((k) => LEAD_COLUMNS.find((c) => c.key === k)!).filter(Boolean);
  const available = LEAD_COLUMNS.filter((c) => !c.managerOnly || isManager);

  return { columns, keys, available, update, reset };
}
