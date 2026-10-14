import type { Prisma } from "@lms/db";

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
