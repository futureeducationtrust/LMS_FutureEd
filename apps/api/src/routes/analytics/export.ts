import PDFDocument from "pdfkit";
import { stringify } from "csv-stringify/sync";
import type { Writable } from "stream";

// ── CSV Export ──
export function generateCSV(
  headers: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const data = rows.map((row) => headers.map((h) => row[h] ?? ""));
  return stringify([headers, ...data]);
}

// ── PDF Export — Employee Performance ──
export function generatePerformancePDF(
  data: {
    employees: Array<{
      employee: { name: string; email: string };
      metrics: {
        totalAssigned: number;
        confirmed: number;
        confirmationRate: number;
        avgResponseHours: number | null;
        overdueFollowUps: number;
        followUpComplianceRate: number;
        performanceScore: number;
        [key: string]: unknown;
      };
    }>;
    period: { from: string | Date; to: string | Date };
  },
  stream: Writable,
): void {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  // Header
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("Employee Performance Report", { align: "center" });

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Period: ${String(data.period.from)} → ${String(data.period.to)}`,
      { align: "center" },
    );

  doc.moveDown(1.5);

  // Table header
  const cols = {
    name: 50,
    assigned: 220,
    confirmed: 290,
    rate: 355,
    score: 430,
  };

  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("Employee", cols.name, doc.y);
  doc.text("Assigned", cols.assigned, doc.y - doc.currentLineHeight());
  doc.text("Confirmed", cols.confirmed, doc.y - doc.currentLineHeight());
  doc.text("Rate %", cols.rate, doc.y - doc.currentLineHeight());
  doc.text("Score", cols.score, doc.y - doc.currentLineHeight());

  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  // Rows
  doc.font("Helvetica").fontSize(9);

  for (const item of data.employees) {
    const y = doc.y;
    doc.text(item.employee.name, cols.name, y, { width: 160 });
    doc.text(String(item.metrics.totalAssigned), cols.assigned, y);
    doc.text(String(item.metrics.confirmed), cols.confirmed, y);
    doc.text(`${item.metrics.confirmationRate}%`, cols.rate, y);

    // Color code performance score
    const score = item.metrics.performanceScore;
    const color = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";
    doc.fillColor(color).text(String(score), cols.score, y);
    doc.fillColor("#000000");

    doc.moveDown(0.6);
  }

  doc.end();
}

// ── PDF Export — Confirmed Applications ──
export function generateConfirmedPDF(
  data: {
    summary: {
      totalConfirmed: number;
      totalFeesCollected: number;
      totalDuesPending: number;
    };
    leads: Array<{
      studentName: string;
      phone: string;
      primaryCourse: string | null;
      confirmedAt: Date | null;
      assignedTo: { name: string } | null;
      bookingAmount: number;
      admissionAmount: number;
      duesAmount: number;
    }>;
    period: { from: Date; to: Date };
  },
  stream: Writable,
): void {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
  doc.pipe(stream);

  // Header
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("Confirmed Applications Report", { align: "center" });

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Period: ${String(data.period.from)} → ${String(data.period.to)}`,
      { align: "center" },
    );

  doc.moveDown();

  // Summary box
  doc.fontSize(11).font("Helvetica-Bold");
  doc.text(`Total Confirmed: ${data.summary.totalConfirmed}   |   `);
  doc.text(
    `Fees Collected: ₹${data.summary.totalFeesCollected.toLocaleString("en-IN")}   |   `,
  );
  doc.text(
    `Dues Pending: ₹${data.summary.totalDuesPending.toLocaleString("en-IN")}`,
  );

  doc.moveDown();
  doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke();
  doc.moveDown(0.5);

  // Table
  const cols = {
    name: 40,
    phone: 180,
    course: 270,
    counsellor: 390,
    booking: 510,
    admission: 580,
    dues: 650,
  };

  doc.fontSize(8).font("Helvetica-Bold");
  doc.text("Student", cols.name, doc.y);
  doc.text("Phone", cols.phone, doc.y - doc.currentLineHeight());
  doc.text("Course", cols.course, doc.y - doc.currentLineHeight());
  doc.text("Counsellor", cols.counsellor, doc.y - doc.currentLineHeight());
  doc.text("Booking ₹", cols.booking, doc.y - doc.currentLineHeight());
  doc.text("Admission ₹", cols.admission, doc.y - doc.currentLineHeight());
  doc.text("Dues ₹", cols.dues, doc.y - doc.currentLineHeight());

  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font("Helvetica").fontSize(8);

  for (const lead of data.leads) {
    if (doc.y > 520) {
      doc.addPage();
      doc.y = 40;
    }

    const y = doc.y;
    doc.text(lead.studentName, cols.name, y, { width: 130 });
    doc.text(lead.phone, cols.phone, y);
    doc.text(lead.primaryCourse ?? "—", cols.course, y, { width: 110 });
    doc.text(lead.assignedTo?.name ?? "—", cols.counsellor, y, { width: 110 });
    doc.text(String(lead.bookingAmount), cols.booking, y);
    doc.text(String(lead.admissionAmount), cols.admission, y);
    doc.text(String(lead.duesAmount), cols.dues, y);
    doc.moveDown(0.6);
  }

  doc.end();
}
