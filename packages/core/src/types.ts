// Success/failure wrapper — core never throws
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: CoreError }

export type CoreError = {
  code: CoreErrorCode
  message: string
  meta?: Record<string, unknown>
}

export type CoreErrorCode =
  | 'INVALID_TRANSITION'
  | 'DUPLICATE_LEAD'
  | 'LEAD_NOT_FOUND'
  | 'INVALID_ASSIGNMENT'
  | 'LOST_LEAD_REVIVAL_REQUIRED'
  | 'ALREADY_CONFIRMED'
  | 'PERMISSION_DENIED'

// Duplicate detection result
export type DuplicateCheckResult =
  | { isDuplicate: false }
  | {
      isDuplicate: true
      matchType: 'PHONE' | 'EMAIL' | 'BOTH'
      existingLeadId: string        // the lead to redirect to
      existingLeadStatus: string
      originalLeadId: string        // if existing is DUPLICATE, this is Lead B
    }

// What happens when a duplicate enquiry comes in
export type DuplicateContinuationData = {
  existingLeadId: string
  continuationNote: string         // auto-generated note for InteractionLog
  newCourseIds: string[]           // new courses to merge in
  newFollowUpAt: Date | null
  sourceId: string | null
}

// Import processing result
export type ImportResult = {
  imported: ProcessedLeadRow[]
  duplicateQueue: DuplicateQueueItem[]
  errors: ImportRowError[]
}

export type ProcessedLeadRow = {
  rowIndex: number
  studentName: string
  phone: string
  email: string | null
  fatherName: string | null
  alternatePhone: string | null
  whatsappNumber: string | null
  gender: string | null
  maritalStatus: string | null
  dateOfBirth: string | null
  city: string | null
  district: string | null
  state: string | null
  village: string | null
  sector: string | null
  qualification: string | null
  schoolCollege: string | null
  boardUniversity: string | null
  passingYear: string | null
  percentage: string | null
  pcmPcbPercentage: string | null
  purpose: string | null
  remarks: string | null
  course: string | null
  source: string | null
}

export type DuplicateQueueItem = {
  rowIndex: number
  rowData: ProcessedLeadRow
  matchType: 'PHONE' | 'EMAIL' | 'BOTH'
  existingLeadId: string
  originalLeadId: string
}

export type ImportRowError = {
  rowIndex: number
  reason: string
}

// Follow-up check result
export type OverdueFollowUp = {
  leadId: string
  studentName: string
  assignedToId: string | null
  assignedToEmail: string | null
  overdueBy: number                // minutes overdue
  nextFollowUpAt: Date
}