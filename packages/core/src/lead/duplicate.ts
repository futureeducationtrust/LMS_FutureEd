import { LeadStatus } from '@lms/types'
import type {
  DuplicateCheckResult,
  DuplicateContinuationData,
} from '../types'

// ─────────────────────────────────────────
// Input: existing leads fetched by API layer
// Core just applies the matching logic
// ─────────────────────────────────────────

type ExistingLead = {
  id: string
  phone: string
  email: string | null
  status: LeadStatus
  isDuplicate: boolean
  duplicateOfId: string | null
}

// ─────────────────────────────────────────
// Check if incoming phone/email matches any existing lead
// Phone OR email = duplicate (either match triggers)
// ─────────────────────────────────────────
export function checkDuplicate(
  incomingPhone: string,
  incomingEmail: string | null | undefined,
  existingLeads: ExistingLead[]
): DuplicateCheckResult {

  for (const lead of existingLeads) {
    const phoneMatch = lead.phone === incomingPhone
    const emailMatch =
      incomingEmail != null &&
      lead.email != null &&
      lead.email.toLowerCase() === incomingEmail.toLowerCase()

    if (!phoneMatch && !emailMatch) continue

    const matchType =
      phoneMatch && emailMatch ? 'BOTH'
      : phoneMatch ? 'PHONE'
      : 'EMAIL'

    // Case 2: Existing lead is itself a duplicate
    // Redirect to the ORIGINAL lead (Lead B), not Lead A
    const targetLeadId =
      lead.isDuplicate && lead.duplicateOfId != null
        ? lead.duplicateOfId
        : lead.id

    return {
      isDuplicate: true,
      matchType,
      existingLeadId: lead.id,
      existingLeadStatus: lead.status,
      originalLeadId: targetLeadId,
    }
  }

  return { isDuplicate: false }
}

// ─────────────────────────────────────────
// Build the continuation data when duplicate found
// This gets added as an InteractionLog entry
// on the ORIGINAL lead
// ─────────────────────────────────────────
export function buildDuplicateContinuation(params: {
  matchType: 'PHONE' | 'EMAIL' | 'BOTH'
  incomingStudentName: string
  incomingSourceName: string | null
  incomingCourseIds: string[]
  incomingFollowUpAt: Date | null
  originalLeadId: string
}): DuplicateContinuationData {

  const {
    matchType,
    incomingStudentName,
    incomingSourceName,
    incomingCourseIds,
    incomingFollowUpAt,
    originalLeadId,
  } = params

  const matchDescription =
    matchType === 'BOTH' ? 'phone and email'
    : matchType === 'PHONE' ? 'phone number'
    : 'email address'

  const sourcePart = incomingSourceName
    ? ` via ${incomingSourceName}`
    : ''

  const continuationNote =
    `Duplicate enquiry received${sourcePart}. ` +
    `Matched by ${matchDescription} with enquiry from "${incomingStudentName}". ` +
    `Continuing follow-up from previous interaction.`

  return {
    existingLeadId: originalLeadId,
    continuationNote,
    newCourseIds: incomingCourseIds,
    newFollowUpAt: incomingFollowUpAt,
    sourceId: null,
  }
}

// ─────────────────────────────────────────
// Handle LOST lead revival
// Called when duplicate check finds a LOST lead
// Returns the prompt data — API layer shows this to user
// User confirms YES/NO — that decision comes back to API
// ─────────────────────────────────────────
export function buildLostLeadRevival(params: {
  lostLeadId: string
  lostLeadStudentName: string
  incomingStudentName: string
  incomingSourceName: string | null
}): {
  requiresRevivalConfirmation: true
  lostLeadId: string
  message: string
  continuationNoteIfRevived: string
} {
  const sourcePart = params.incomingSourceName
    ? ` via ${params.incomingSourceName}`
    : ''

  return {
    requiresRevivalConfirmation: true,
    lostLeadId: params.lostLeadId,
    message:
      `This lead was previously marked as LOST. ` +
      `A new enquiry was received${sourcePart} from "${params.incomingStudentName}". ` +
      `Would you like to continue follow-up?`,
    continuationNoteIfRevived:
      `Lead revived. New enquiry received${sourcePart} ` +
      `from "${params.incomingStudentName}". Continuing follow-up.`,
  }
}