// ─────────────────────────────────────────
// CAMPAIGN — pure logic, no I/O.
// Naming, versioning, lead distribution and the resume cursor live here
// so the API route stays thin and the behaviour is unit-testable.
// ─────────────────────────────────────────

const MAX_CAMPAIGN_NAME = 80;

// "JEEMAIN_NEET_Mausami_DATA (1).xlsx" → "JEEMAIN NEET Mausami DATA (1)"
// Strips the extension, turns _ and runs of whitespace into single spaces,
// trims, and caps the length. Falls back to "Import" for an empty result.
export function deriveCampaignName(fileName: string): string {
  const base = String(fileName ?? "")
    .trim()
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[_\s]+/g, " ")
    .replace(/[^\p{L}\p{N} ()\-.&]/gu, "")
    .trim()
    .slice(0, MAX_CAMPAIGN_NAME)
    .trim();
  return base.length > 0 ? base : "Import";
}

// Policy (b): a colliding name is versioned, never appended to.
// "Leads" with existing ["Leads", "Leads (2)"] → "Leads (3)"
// Also works when the base itself already carries a suffix.
export function nextVersionedName(base: string, existingNames: string[]): string {
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${base} (${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} (${Date.now()})`;
}

// Round-robin every lead across the assignees, in a stable order.
// Returns one entry per lead so the caller can write assignedToId and
// AssignmentHistory in a single pass.
export function distributeLeadsRoundRobin(
  leadIds: string[],
  assigneeIds: string[],
): Array<{ leadId: string; assignedToId: string }> {
  if (assigneeIds.length === 0) return [];
  return leadIds.map((leadId, i) => ({
    leadId,
    assignedToId: assigneeIds[i % assigneeIds.length]!,
  }));
}

// ─────────────────────────────────────────
// Resume cursor
//
// The work view walks an ordered list of lead ids (the employee's leads
// in this campaign). Progress is a single lastLeadId per (user, campaign).
//
//   - no progress yet        → start at index 0
//   - lastLeadId still in    → resume AT that lead (it may be unfinished)
//     the list
//   - lastLeadId no longer   → resume at the lead that now occupies the
//     in the list (moved,      same position, clamped to the end
//     reassigned, deleted)
// ─────────────────────────────────────────
export type ResumeResult = {
  index: number;       // 0-based position in orderedLeadIds, -1 when empty
  leadId: string | null;
  total: number;
};

export function resolveResumeIndex(
  orderedLeadIds: string[],
  lastLeadId: string | null | undefined,
  lastKnownIndex?: number | null,
): ResumeResult {
  const total = orderedLeadIds.length;
  if (total === 0) return { index: -1, leadId: null, total };

  if (lastLeadId) {
    const idx = orderedLeadIds.indexOf(lastLeadId);
    if (idx >= 0) return { index: idx, leadId: orderedLeadIds[idx]!, total };
    if (typeof lastKnownIndex === "number" && lastKnownIndex >= 0) {
      const clamped = Math.min(lastKnownIndex, total - 1);
      return { index: clamped, leadId: orderedLeadIds[clamped]!, total };
    }
  }
  return { index: 0, leadId: orderedLeadIds[0]!, total };
}

// Next / previous relative to a lead, within the same ordered list.
export function neighbourIds(
  orderedLeadIds: string[],
  currentLeadId: string,
): { prevId: string | null; nextId: string | null; index: number; total: number } {
  const index = orderedLeadIds.indexOf(currentLeadId);
  const total = orderedLeadIds.length;
  if (index < 0) return { prevId: null, nextId: null, index: -1, total };
  return {
    prevId: index > 0 ? orderedLeadIds[index - 1]! : null,
    nextId: index < total - 1 ? orderedLeadIds[index + 1]! : null,
    index,
    total,
  };
}
