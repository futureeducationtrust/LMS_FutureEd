import { z } from "zod";

// ── Campaign list query ──
export const CampaignListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [20, 50, 80].includes(n), {
      message: "Page size must be 20, 50, or 80",
    })
    .default(20),
  search: z.string().trim().max(100).optional(),
  // active = not archived and has leads still NEW; completed = no NEW leads left; archived = isArchived
  status: z.enum(["active", "completed", "archived", "all"]).default("active"),
  assigneeId: z.union([z.literal("unassigned"), z.string().cuid()]).optional(),
  createdById: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format").optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format").optional(),
  sortBy: z.enum(["createdAt", "name", "leadCount", "progress"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ── Assign campaign to one or more employees ──
// Policy: ALL leads in the campaign are (re)assigned across these users.
export const AssignCampaignSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(50),
  reason: z.string().trim().max(500).optional(),
});

// ── Rename / archive ──
export const UpdateCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.isArchived !== undefined, {
    message: "Nothing to update",
  });

// ── Work-view progress ──
export const CampaignProgressSchema = z.object({
  lastLeadId: z.string().cuid(),
});

export type CampaignListQuery = z.infer<typeof CampaignListQuerySchema>;
export type AssignCampaignInput = z.infer<typeof AssignCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
export type CampaignProgressInput = z.infer<typeof CampaignProgressSchema>;
