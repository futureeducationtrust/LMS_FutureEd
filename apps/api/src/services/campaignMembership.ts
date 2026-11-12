import type { Prisma, PrismaClient } from "@lms/db";
import { Role } from "@lms/types";

export type WritableCampaign = { id: string; name: string; branchId: string };

// Adding leads to an existing campaign (manual create or Excel append).
// Managers only; a sub-admin is limited to their own branch; archived
// campaigns must be restored first so leads don't land somewhere hidden.
export async function resolveWritableCampaign(
  prisma: PrismaClient | Prisma.TransactionClient,
  campaignId: string,
  user: { role: Role; branchId: string },
): Promise<
  | { ok: true; campaign: WritableCampaign }
  | { ok: false; status: number; code: string; message: string }
> {
  if (user.role !== Role.ADMIN && user.role !== Role.SUB_ADMIN) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "Only Admins and Sub Admins can add leads to a campaign" };
  }
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, branchId: true, isArchived: true },
  });
  if (!campaign) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Campaign not found" };
  }
  if (user.role === Role.SUB_ADMIN && campaign.branchId !== user.branchId) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "Campaign belongs to another branch" };
  }
  if (campaign.isArchived) {
    return { ok: false, status: 400, code: "CAMPAIGN_ARCHIVED", message: `"${campaign.name}" is archived — restore it before adding leads` };
  }
  return { ok: true, campaign: { id: campaign.id, name: campaign.name, branchId: campaign.branchId } };
}

// A lead assigned outside the campaign Assign modal (Leads → bulk assign,
// single reassign) still belongs to its campaign. Make the new owner a
// campaign member so the campaign shows in their list with their leads.
export async function ensureCampaignMembership(
  tx: Prisma.TransactionClient,
  params: { leadIds: string[]; userId: string; actorUserId: string },
): Promise<void> {
  if (params.leadIds.length === 0) return;
  const rows = await tx.lead.findMany({
    where: { id: { in: params.leadIds }, campaignId: { not: null } },
    select: { campaignId: true },
    distinct: ["campaignId"],
  });
  if (rows.length === 0) return;
  await tx.campaignAssignee.createMany({
    data: rows.map((r) => ({
      campaignId: r.campaignId!,
      userId: params.userId,
      assignedById: params.actorUserId,
    })),
    skipDuplicates: true,
  });
}
