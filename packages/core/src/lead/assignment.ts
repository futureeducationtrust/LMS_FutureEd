import { Role } from '@lms/types'
import type { Result } from '../types'

type AssignmentContext = {
  creatorId: string
  creatorRole: Role
  explicitAssigneeId?: string   // only provided by Sub Admin/Admin
}

// ─────────────────────────────────────────
// Determine assignedToId at lead creation time
//
// EMPLOYEE creates lead → assigned to themselves
// SUB_ADMIN/ADMIN creates → use explicit assignee if provided,
//                           otherwise assign to themselves
// ─────────────────────────────────────────
export function resolveAssigneeOnCreate(
  context: AssignmentContext
): string {
  if (context.creatorRole === Role.EMPLOYEE) {
    return context.creatorId
  }

  // Sub Admin or Admin — use explicit if provided, else self
  return context.explicitAssigneeId ?? context.creatorId
}

// ─────────────────────────────────────────
// Validate a reassignment operation
// Only validates business rules — permission check
// already done in auth package before calling this
// ─────────────────────────────────────────
export function validateReassignment(params: {
  newAssigneeId: string
  newAssigneeRole: Role
  leadStatus: string
}): Result<{ assignedToId: string }> {

  // Cannot assign to another Sub Admin or Admin
  // Leads are worked by employees
  if (
    params.newAssigneeRole === Role.ADMIN ||
    params.newAssigneeRole === Role.SUB_ADMIN
  ) {
    return {
      success: false,
      error: {
        code: 'INVALID_ASSIGNMENT',
        message: 'Leads can only be assigned to employees.',
        meta: { newAssigneeRole: params.newAssigneeRole },
      },
    }
  }

  // Cannot reassign a confirmed lead
  if (params.leadStatus === 'CONFIRMED') {
    return {
      success: false,
      error: {
        code: 'ALREADY_CONFIRMED',
        message: 'Confirmed leads cannot be reassigned.',
        meta: { leadStatus: params.leadStatus },
      },
    }
  }

  return {
    success: true,
    data: { assignedToId: params.newAssigneeId },
  }
}