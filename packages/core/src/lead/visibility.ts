import { LeadStatus, Role } from '@lms/types'

// 1 hour in milliseconds
const CONFIRMED_VISIBILITY_WINDOW_MS = 60 * 60 * 1000

type VisibilityLead = {
  id: string
  status: LeadStatus
  assignedToId: string | null
  createdById: string
  confirmedAt: Date | null
  confirmedById: string | null
}

type VisibilityUser = {
  id: string
  role: Role
}

// ─────────────────────────────────────────
// Can this user see this lead?
// Extended version of canViewLead from auth
// that also handles confirmed visibility window
// ─────────────────────────────────────────
export function canEmployeeSeeConfirmedLead(params: {
  lead: VisibilityLead
  user: VisibilityUser
  now?: Date
}): boolean {
  const { lead, user, now = new Date() } = params

  // Admin and Sub Admin always see everything
  if (user.role === Role.ADMIN || user.role === Role.SUB_ADMIN) {
    return true
  }

  // Lead is not confirmed — standard visibility rules apply
  if (lead.status !== LeadStatus.CONFIRMED) {
    return lead.assignedToId === user.id || lead.createdById === user.id
  }

  // Lead IS confirmed — check 1 hour window
  if (!lead.confirmedAt) return false

  // Employee must be the one who confirmed it
  if (lead.confirmedById !== user.id) return false

  // Check if within 1 hour window
  const elapsed = now.getTime() - lead.confirmedAt.getTime()
  return elapsed <= CONFIRMED_VISIBILITY_WINDOW_MS
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