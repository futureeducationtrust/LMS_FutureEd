import { checkDuplicate } from "../lead/duplicate";
import type {
  ImportResult,
  ProcessedLeadRow,
  DuplicateQueueItem,
  ImportRowError,
} from "../types";

export type ExcelRow = {
  rowIndex: number;
  studentName?: string;
  phone?: string;
  email?: string;
  fatherName?: string;
  alternatePhone?: string;
  whatsappNumber?: string;
  gender?: string;
  maritalStatus?: string;
  dateOfBirth?: string;
  city?: string;
  district?: string;
  state?: string;
  village?: string;
  sector?: string;
  qualification?: string;
  schoolCollege?: string;
  boardUniversity?: string;
  passingYear?: string;
  percentage?: string;
  pcmPcbPercentage?: string;
  purpose?: string;
  remarks?: string;
  course?: string;
  source?: string;
  courseNames?: string[];
  sourceName?: string;
};

type ExistingLeadForCheck = {
  id: string;
  phone: string;
  email: string | null;
  status: any;
  isDuplicate: boolean;
  duplicateOfId: string | null;
};

// ─────────────────────────────────────────
// Process Excel rows against existing leads
//
// Clean leads   → returned as ProcessedLeadRow[]
// Duplicates    → returned as DuplicateQueueItem[]
// Invalid rows  → returned as ImportRowError[]
//
// API layer creates DB records for clean leads
// API layer creates DuplicateQueue records for duplicates
// ─────────────────────────────────────────
export function processImportRows(
  rows: ExcelRow[],
  existingLeads: ExistingLeadForCheck[],
): ImportResult {
  const imported: ProcessedLeadRow[] = [];
  const duplicateQueue: DuplicateQueueItem[] = [];
  const errors: ImportRowError[] = [];

  for (const row of rows) {
    // Validate required fields
    if (!row.studentName?.trim()) {
      errors.push({
        rowIndex: row.rowIndex,
        reason: "Student name is required",
      });
      continue;
    }

    if (!row.phone?.trim()) {
      errors.push({
        rowIndex: row.rowIndex,
        reason: "Phone number is required",
      });
      continue;
    }

    const processedRow: ProcessedLeadRow = {
      rowIndex: row.rowIndex,
      studentName: row.studentName.trim(),
      phone: row.phone.trim(),
      email: row.email?.trim() ?? null,
      fatherName: row.fatherName?.trim() ?? null,
      alternatePhone: row.alternatePhone?.trim() ?? null,
      whatsappNumber: row.whatsappNumber?.trim() ?? null,
      gender: row.gender?.trim() ?? null,
      maritalStatus: row.maritalStatus?.trim() ?? null,
      dateOfBirth: row.dateOfBirth?.trim() ?? null,
      city: row.city?.trim() ?? null,
      district: row.district?.trim() ?? null,
      state: row.state?.trim() ?? null,
      village: row.village?.trim() ?? null,
      sector: row.sector?.trim() ?? null,
      qualification: row.qualification?.trim() ?? null,
      schoolCollege: row.schoolCollege?.trim() ?? null,
      boardUniversity: row.boardUniversity?.trim() ?? null,
      passingYear: row.passingYear?.trim() ?? null,
      percentage: row.percentage?.trim() ?? null,
      pcmPcbPercentage: row.pcmPcbPercentage?.trim() ?? null,
      purpose: row.purpose?.trim() ?? null,
      remarks: row.remarks?.trim() ?? null,
      course: row.course?.trim() ?? null,
      source: row.source?.trim() ?? null,
    };

    // Check for duplicates against existing DB leads
    // Also check against already-processed rows in this batch
    const alreadyProcessed = imported.map((r) => ({
      id: `import-${r.rowIndex}`,
      phone: r.phone,
      email: r.email,
      status: "NEW" as any,
      isDuplicate: false,
      duplicateOfId: null,
    }));

    const allLeads = [...existingLeads, ...alreadyProcessed];
    const duplicateCheck = checkDuplicate(
      processedRow.phone,
      processedRow.email,
      allLeads,
    );

    if (duplicateCheck.isDuplicate) {
      duplicateQueue.push({
        rowIndex: row.rowIndex,
        rowData: processedRow,
        matchType: duplicateCheck.matchType,
        existingLeadId: duplicateCheck.existingLeadId,
        originalLeadId: duplicateCheck.originalLeadId,
      });
      continue;
    }

    imported.push(processedRow);
  }

  return { imported, duplicateQueue, errors };
}
