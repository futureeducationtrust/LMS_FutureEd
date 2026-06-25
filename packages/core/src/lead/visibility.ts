import { Role } from '@lms/types'

type VisibilityLead = {
  id: string
  assignedToId: string | null
  createdById: string
  confirmedById: string | null
}

type VisibilityUser = {
  id: string
  role: Role
}

// ─────────────────────────────────────────
// Can this employee see this confirmed lead?
// Employees can view confirmed leads they were
// assigned to, created, or confirmed — always.
// ─────────────────────────────────────────
export function canEmployeeSeeConfirmedLead(params: {
  lead: VisibilityLead
  user: VisibilityUser
}): boolean {
  const { lead, user } = params

  if (user.role === Role.ADMIN || user.role === Role.SUB_ADMIN) return true

  return (
    lead.assignedToId === user.id ||
    lead.createdById === user.id ||
    lead.confirmedById === user.id
  )
}

// ─────────────────────────────────────────
// Build the confirmed lead tag for Admin/Sub Admin view
// "Confirmed by John Doe"
// ─────────────────────────────────────────
export function buildConfirmedByTag(params: {
  confirmedByName: string
  confirmedAt: Date
}): string {
  const timeAgo = formatTimeAgo(params.confirmedAt)
  return `Confirmed by ${params.confirmedByName} (${timeAgo})`
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}