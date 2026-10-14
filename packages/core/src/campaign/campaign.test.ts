import { describe, it, expect } from "vitest";
import {
  deriveCampaignName,
  nextVersionedName,
  distributeLeadsRoundRobin,
  allocateLeadsByCount,
  resolveResumeIndex,
  neighbourIds,
} from "./index";

describe("deriveCampaignName", () => {
  it("strips the extension and normalises separators", () => {
    expect(deriveCampaignName("JEEMAIN_NEET_Mausami_DATA.xlsx")).toBe(
      "JEEMAIN NEET Mausami DATA",
    );
    expect(deriveCampaignName("  leads   sept.csv ")).toBe("leads sept");
    expect(deriveCampaignName("2026_05_04_B.ED & D.EIED DATA.xls")).toBe(
      "2026 05 04 B.ED & D.EIED DATA",
    );
  });
  it("falls back when nothing usable remains", () => {
    expect(deriveCampaignName(".xlsx")).toBe("Import");
    expect(deriveCampaignName("")).toBe("Import");
  });
});

describe("nextVersionedName — policy (b), version never append", () => {
  it("keeps the name when free", () => {
    expect(nextVersionedName("Leads", [])).toBe("Leads");
  });
  it("versions on collision, case-insensitively", () => {
    expect(nextVersionedName("Leads", ["leads"])).toBe("Leads (2)");
    expect(nextVersionedName("Leads", ["Leads", "Leads (2)"])).toBe("Leads (3)");
  });
  it("fills the first free slot", () => {
    expect(nextVersionedName("Leads", ["Leads", "Leads (3)"])).toBe("Leads (2)");
  });
});

describe("distributeLeadsRoundRobin", () => {
  it("spreads leads evenly and deterministically", () => {
    const out = distributeLeadsRoundRobin(["l1", "l2", "l3", "l4", "l5"], ["a", "b"]);
    expect(out.map((o) => o.assignedToId)).toEqual(["a", "b", "a", "b", "a"]);
  });
  it("returns nothing when there are no assignees", () => {
    expect(distributeLeadsRoundRobin(["l1"], [])).toEqual([]);
  });
});

describe("allocateLeadsByCount", () => {
  const fresh = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `l${i + 1}`, assignedToId: null }));
  const tally = (out: Array<{ assignedToId: string | null }>) =>
    out.reduce<Record<string, number>>((m, o) => ((m[o.assignedToId ?? "none"] = (m[o.assignedToId ?? "none"] ?? 0) + 1), m), {});

  it("gives each assignee exactly their count (200 → 80/60/40/20)", () => {
    const out = allocateLeadsByCount(fresh(200), [
      { userId: "a", count: 80 }, { userId: "b", count: 60 }, { userId: "c", count: 40 }, { userId: "d", count: 20 },
    ]);
    expect(tally(out)).toEqual({ a: 80, b: 60, c: 40, d: 20 });
  });
  it("leaves the remainder unassigned when counts sum below the total", () => {
    const out = allocateLeadsByCount(fresh(10), [{ userId: "a", count: 3 }, { userId: "b", count: 2 }]);
    expect(tally(out)).toEqual({ a: 3, b: 2, none: 5 });
  });
  it("keeps an assignee's existing leads when their count grows", () => {
    const leads = [
      { id: "l1", assignedToId: "b" }, { id: "l2", assignedToId: "a" },
      { id: "l3", assignedToId: "b" }, { id: "l4", assignedToId: null },
    ];
    const out = allocateLeadsByCount(leads, [{ userId: "a", count: 2 }, { userId: "b", count: 2 }]);
    expect(out).toEqual([
      { leadId: "l1", assignedToId: "b" }, { leadId: "l2", assignedToId: "a" },
      { leadId: "l3", assignedToId: "b" }, { leadId: "l4", assignedToId: "a" },
    ]);
  });
  it("releases leads of users who were dropped or whose count shrank", () => {
    const leads = [
      { id: "l1", assignedToId: "a" }, { id: "l2", assignedToId: "a" }, { id: "l3", assignedToId: "x" },
    ];
    const out = allocateLeadsByCount(leads, [{ userId: "a", count: 1 }]);
    expect(out.map((o) => o.assignedToId)).toEqual(["a", null, null]);
  });
});

// ─────────────────────────────────────────
// The scenario from the brief:
// work campaign A partway → switch to campaign B → return to campaign A
// → must resume at the correct lead, per (employee, campaign), not globally.
// ─────────────────────────────────────────
describe("resume-where-left-off is per (employee, campaign)", () => {
  // Simulates the CampaignProgress table: key = `${userId}:${campaignId}`
  const progress = new Map<string, string>();
  const save = (userId: string, campaignId: string, leadId: string) =>
    progress.set(`${userId}:${campaignId}`, leadId);
  const load = (userId: string, campaignId: string) =>
    progress.get(`${userId}:${campaignId}`) ?? null;

  const campaignA = ["A1", "A2", "A3", "A4", "A5"];
  const campaignB = ["B1", "B2", "B3"];
  const me = "emp-1";

  it("resumes A at the lead where I left it after working B", () => {
    // Work A: open A1, Next → A2, Next → A3
    let cur = resolveResumeIndex(campaignA, load(me, "A"));
    expect(cur.leadId).toBe("A1");
    save(me, "A", cur.leadId!);
    cur = { ...cur, leadId: neighbourIds(campaignA, "A1").nextId! };
    save(me, "A", cur.leadId!);
    cur = { ...cur, leadId: neighbourIds(campaignA, "A2").nextId! };
    save(me, "A", cur.leadId!);
    expect(load(me, "A")).toBe("A3");

    // Switch to B: starts at B1, Next → B2
    let b = resolveResumeIndex(campaignB, load(me, "B"));
    expect(b.leadId).toBe("B1");
    save(me, "B", b.leadId!);
    b = { ...b, leadId: neighbourIds(campaignB, "B1").nextId! };
    save(me, "B", b.leadId!);
    expect(load(me, "B")).toBe("B2");

    // Return to A: must be A3, not B2 and not A1
    const back = resolveResumeIndex(campaignA, load(me, "A"));
    expect(back.leadId).toBe("A3");
    expect(back.index).toBe(2);
    expect(back.total).toBe(5);

    // And B is untouched by working A
    const backB = resolveResumeIndex(campaignB, load(me, "B"));
    expect(backB.leadId).toBe("B2");
  });

  it("does not leak between employees on the same campaign", () => {
    save("emp-2", "A", "A5");
    expect(resolveResumeIndex(campaignA, load("emp-2", "A")).leadId).toBe("A5");
    expect(resolveResumeIndex(campaignA, load(me, "A")).leadId).toBe("A3");
  });

  it("falls back sensibly when the remembered lead left the list", () => {
    // A3 got reassigned away; we remembered index 2 → resume at the lead now at index 2
    const shrunk = ["A1", "A2", "A4", "A5"];
    expect(resolveResumeIndex(shrunk, "A3", 2).leadId).toBe("A4");
    // remembered index beyond the end → clamp to last
    expect(resolveResumeIndex(["A1"], "A3", 2).leadId).toBe("A1");
    // nothing remembered → start
    expect(resolveResumeIndex(shrunk, null).leadId).toBe("A1");
    // empty list
    expect(resolveResumeIndex([], "A3")).toEqual({ index: -1, leadId: null, total: 0 });
  });
});

describe("neighbourIds", () => {
  it("returns prev/next and position", () => {
    expect(neighbourIds(["a", "b", "c"], "b")).toEqual({ prevId: "a", nextId: "c", index: 1, total: 3 });
    expect(neighbourIds(["a", "b", "c"], "a").prevId).toBeNull();
    expect(neighbourIds(["a", "b", "c"], "c").nextId).toBeNull();
    expect(neighbourIds(["a"], "zz").index).toBe(-1);
  });
});
