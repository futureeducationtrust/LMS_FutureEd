// Types
export type {
  Result,
  CoreError,
  CoreErrorCode,
  DuplicateCheckResult,
  DuplicateContinuationData,
  ImportResult,
  ProcessedLeadRow,
  DuplicateQueueItem,
  ImportRowError,
  OverdueFollowUp,
} from "./types";

// State machine
export {
  isValidTransition,
  getValidTransitions,
  transitionLead,
} from "./lead/stateMachine";

// Duplicate
export {
  checkDuplicate,
  buildDuplicateContinuation,
  buildLostLeadRevival,
} from "./lead/duplicate";

// Assignment
export {
  resolveAssigneeOnCreate,
  validateReassignment,
} from "./lead/assignment";

// Follow-up
export {
  detectOverdueFollowUps,
  buildFollowUpNotification,
} from "./lead/followUp";

// Import
export { processImportRows } from "./import/processor";
export type { ExcelRow } from "./import/processor";
