"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import api from "@/lib/api";
import { extractApiError } from "@/lib/utils";
import { Role } from "@lms/types";
import { cn } from "@/lib/utils";

type ParsedRow = {
  rowIndex: number;
  studentName: string;
  phone: string;
  email: string | null;
  fatherName: string | null;
  alternatePhone: string | null;
  whatsappNumber: string | null;
  gender: string | null;
  maritalStatus: string | null;
  dateOfBirth: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  village: string | null;
  sector: string | null;
  qualification: string | null;
  schoolCollege: string | null;
  boardUniversity: string | null;
  passingYear: string | null;
  percentage: string | null;
  pcmPcbPercentage: string | null;
  purpose: string | null;
  remarks: string | null;
  course: string | null;
  source: string | null;
  [key: string]: unknown;
};

type ImportResult = {
  imported: ParsedRow[];
  duplicateQueue: Array<{
    rowIndex: number;
    rowData: ParsedRow;
    matchType: string;
    existingLeadId: string;
  }>;
  errors: Array<{ rowIndex: number; reason: string }>;
};

// COLUMN_MAP maps spreadsheet headers to internal field names
const COLUMN_MAP: Record<string, string> = {
  // Student name
  "student name": "studentName",
  studentname: "studentName",
  name: "studentName",
  candidate: "studentName",
  "candidate name": "studentName",

  // Phone
  phone: "phone",
  mobile: "phone",
  "mobile no": "phone",
  "mobile no.": "phone",
  "mobile number": "phone",
  tel: "phone",
  "tel/mob": "phone",
  telmob: "phone",
  contact: "phone",
  "contact no": "phone",

  // Alternate phone
  "alternate phone": "alternatePhone",
  "alt phone": "alternatePhone",
  "alternate mobile": "alternatePhone",
  altphone: "alternatePhone",
  "phone 2": "alternatePhone",
  "mobile 2": "alternatePhone",

  // WhatsApp
  whatsapp: "whatsappNumber",
  "whatsapp number": "whatsappNumber",
  "whatsapp no": "whatsappNumber",
  wp: "whatsappNumber",
  "wp no": "whatsappNumber",

  // Email
  email: "email",
  "email id": "email",
  emailid: "email",
  "e-mail": "email",

  // Father name
  "father name": "fatherName",
  fathername: "fatherName",
  father: "fatherName",
  "father's name": "fatherName",

  // Gender
  gender: "gender",
  sex: "gender",

  // Marital status
  "marital status": "maritalStatus",
  maritalstatus: "maritalStatus",
  marital: "maritalStatus",

  // Date of birth
  dob: "dateOfBirth",
  "date of birth": "dateOfBirth",
  dateofbirth: "dateOfBirth",
  "birth date": "dateOfBirth",
  birthdate: "dateOfBirth",

  // Location
  city: "city",
  district: "district",
  state: "state",
  village: "village",
  address: "village",
  sector: "sector",
  "sector/area": "sector",

  // Academic
  qualification: "qualification",
  "passing year": "passingYear",
  passingyear: "passingYear",
  "pass year": "passingYear",
  percentage: "percentage",
  marks: "percentage",
  "marks%": "percentage",
  "%marks": "percentage",
  "pcm%": "pcmPcbPercentage",
  "pcb%": "pcmPcbPercentage",
  "pcm/pcb": "pcmPcbPercentage",
  pcmpcb: "pcmPcbPercentage",
  pcm: "pcmPcbPercentage",
  pcb: "pcmPcbPercentage",
  "school/college": "schoolCollege",
  "school college": "schoolCollege",
  schoolcollege: "schoolCollege",
  school: "schoolCollege",
  college: "schoolCollege",
  "board/university": "boardUniversity",
  boarduniversity: "boardUniversity",
  board: "boardUniversity",
  university: "boardUniversity",

  // Course
  course: "course",
  courses: "course",
  "course name": "course",
  "course interest": "course",
  programme: "course",
  program: "course",

  // Source
  source: "source",
  "lead source": "source",
  leadsource: "source",
  "source of enquiry": "source",
  "how did you hear": "source",
  reference: "source",
  "referred by": "source",

  // Other
  purpose: "purpose",
  interest: "purpose",
  remarks: "remarks",
  remark: "remarks",
  notes: "remarks",
  note: "remarks",
  comment: "remarks",
  comments: "remarks",
};

function parseExcelFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
        const raw = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
        }) as string[][];

        if (raw.length < 2) {
          resolve([]);
          return;
        }

        const headers = raw[0]!.map((h) => String(h).trim().toLowerCase());
        const rows: ParsedRow[] = [];

        for (let i = 1; i < raw.length; i++) {
          const row = raw[i]!;
          const parsed: Record<string, unknown> = { rowIndex: i };

          headers.forEach((header, j) => {
            const mapped = COLUMN_MAP[header];
            if (mapped) parsed[mapped] = row[j] ? String(row[j]).trim() : null;
          });

          if (parsed["phone"]) {
            const cleaned = String(parsed["phone"])
              .replace(/[\s\-\+]/g, "")
              .replace(/^91/, "")
              .replace(/^0/, "");
            parsed["phone"] = cleaned;
          }

          if (parsed["qualification"]) {
            const qualMap: Record<string, string> = {
              "10": "TENTH",
              "10th": "TENTH",
              matric: "TENTH",
              x: "TENTH",
              "12": "TWELFTH",
              "12th": "TWELFTH",
              inter: "TWELFTH",
              xii: "TWELFTH",
              graduation: "GRADUATION",
              graduate: "GRADUATION",
              ug: "GRADUATION",
              pg: "POST_GRADUATION",
              "post graduation": "POST_GRADUATION",
            };
            const rawQ = String(parsed["qualification"]).toLowerCase().trim();
            parsed["qualification"] = qualMap[rawQ] ?? parsed["qualification"];
          }

          if (parsed["gender"]) {
            const gMap: Record<string, string> = {
              male: "MALE", m: "MALE",
              female: "FEMALE", f: "FEMALE",
              other: "OTHER", o: "OTHER",
            };
            const rawG = String(parsed["gender"]).toLowerCase().trim();
            parsed["gender"] = gMap[rawG] ?? null;
          }

          if (parsed["maritalStatus"]) {
            const mMap: Record<string, string> = {
              single: "SINGLE", unmarried: "SINGLE", s: "SINGLE",
              married: "MARRIED",
            };
            const rawM = String(parsed["maritalStatus"]).toLowerCase().trim();
            parsed["maritalStatus"] = mMap[rawM] ?? null;
          }

          const phone = parsed["phone"]
            ? String(parsed["phone"]).replace(/\D/g, "")
            : "";
          const name = parsed["studentName"]
            ? String(parsed["studentName"]).trim()
            : "";

          if (!name || !phone) continue;

          parsed["phone"] = phone;
          parsed["studentName"] = name;

          rows.push(parsed as ParsedRow);
        }

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export default function ImportPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { success, error } = useNotifications();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [preview, setPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicateActions] = useState<Record<number, "skip" | "merge">>({});
  const [courses, setCourses] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    api.get("/settings/courses?isActive=true").then(({ data }) => {
      setCourses((data.data as any[]).map((c: any) => c.name));
    }).catch(() => {});
    api.get("/settings/sources").then(({ data }) => {
      setSources((data.data as any[]).filter((s: any) => s.isActive).map((s: any) => s.name));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user && user.role === Role.EMPLOYEE) router.replace("/dashboard");
  }, [user, router]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setParsedRows([]);
    try {
      const rows = await parseExcelFile(f);
      setParsedRows(rows);
      setPreview(true);
    } catch {
      error(
        "Failed to parse file",
        "Make sure it is a valid .xlsx or .csv file",
      );
    }
  }

  async function handleImport() {
    if (!parsedRows.length) return;
    setImporting(true);

    try {
      const { data } = await api.post("/leads/import", {
        rows: parsedRows,
        duplicateActions,
      });
      setResult(data.data);
      setPreview(false);
      success(`Import complete! ${data.data.imported.length} leads imported.`);
    } catch (e) {
      error("Import failed", extractApiError(e));
    } finally {
      setImporting(false);
    }
  }

  const templateHref = useMemo(() => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "student name", "phone", "email", "father name",
        "alternate phone", "whatsapp", "gender", "marital status",
        "date of birth", "city", "district", "state", "village", "sector",
        "qualification", "school/college", "board/university",
        "passing year", "percentage", "pcm/pcb",
        "course", "source",
        "purpose", "remarks",
      ],
      [
        "John Doe", "9876543210", "john@email.com", "Robert Doe",
        "9876543211", "9876543210", "Male", "Single",
        "01/01/2005", "Bokaro", "Bokaro", "Jharkhand", "Chas", "Sector 4",
        "12th", "DAV Public School", "CBSE",
        "2024", "75", "80",
        "B.Tech CSE", "Facebook",
        "Engineering", "Interested in B.Tech CSE",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" }) as string;
    return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
  }, []);

  const validRows = parsedRows.filter((r) => r.phone && r.studentName);
  const invalidRows = parsedRows.filter((r) => !r.phone || !r.studentName);

  if (!user || user.role === Role.EMPLOYEE) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Bulk import student leads from Excel or CSV
          </p>
        </div>
        <a
          href={templateHref}
          download="lead-import-template.xlsx"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors"
        >
          <Download size={14} />
          Download Template
        </a>
      </div>

      {/* Course / Source reference */}
      {(courses.length > 0 || sources.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 text-xs">
          <p className="font-semibold text-amber-800">
            Use these exact names in your Excel for Course and Source columns:
          </p>
          {courses.length > 0 && (
            <div>
              <p className="font-medium text-amber-700 mb-1.5">Courses</p>
              <div className="flex flex-wrap gap-1.5">
                {courses.map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded-full bg-white border border-amber-300 text-amber-900 font-mono">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {sources.length > 0 && (
            <div>
              <p className="font-medium text-amber-700 mb-1.5">Sources</p>
              <div className="flex flex-wrap gap-1.5">
                {sources.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-white border border-amber-300 text-amber-900 font-mono">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload zone */}
      {!file && (
        <div
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload Excel or CSV file"
          className="border-2 border-dashed border-surface-300 rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-primary hover:bg-primary-50 transition-colors"
        >
          <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={28} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-700">
              Upload Excel or CSV file
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Drag & drop or click to browse · .xlsx, .csv · Max 5MB
            </p>
          </div>
          <Button variant="secondary">
            <Upload size={14} />
            Choose File
          </Button>
          <label htmlFor="lead-import-file" className="sr-only">
            Choose a lead import file
          </label>
          <input
            id="lead-import-file"
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,.xls"
            onChange={(e) => void handleFileSelect(e)}
            className="hidden"
          />
        </div>
      )}

      {/* File selected — preview */}
      {file && !result && (
        <div className="space-y-4">
          <div className="bg-white border border-surface-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-primary" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {parsedRows.length} rows detected
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setParsedRows([]);
                setResult(null);
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
              aria-label="Remove selected file"
              title="Remove selected file"
            >
              <X size={16} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Valid Rows",
                value: validRows.length,
                color: "text-green-600 bg-green-50",
              },
              {
                label: "Invalid Rows",
                value: invalidRows.length,
                color: "text-red-600 bg-red-50",
              },
              {
                label: "Total Rows",
                value: parsedRows.length,
                color: "text-gray-600 bg-surface-100",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn("rounded-xl p-4 text-center", stat.color)}
              >
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Preview table */}
          {preview && validRows.length > 0 && (
            <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  Preview (first 10 rows)
                </p>
                <Badge variant="success">
                  {validRows.length} ready to import
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-100 bg-surface-50">
                      {[
                        "#", "Student Name", "Phone", "Father Name",
                        "Email", "City", "State", "Qualification",
                        "School/College", "Year", "%", "Gender",
                        "Course", "Source", "Remarks", "Status",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-50">
                    {validRows.slice(0, 10).map((row) => (
                      <tr key={row.rowIndex} className="hover:bg-surface-50">
                        <td className="px-3 py-2 text-xs text-gray-400">{row.rowIndex}</td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-800 whitespace-nowrap">{row.studentName}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{row.phone}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.fatherName ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{row.email ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{row.city ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{row.state ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{row.qualification ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.schoolCollege ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{row.passingYear ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{row.percentage ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{row.gender ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.course ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{row.source ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 max-w-[160px] truncate" title={row.remarks ?? ""}>{row.remarks ?? "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant="success">Ready</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invalid rows warning */}
          {invalidRows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={15} className="text-red-500" />
                <p className="text-sm font-semibold text-red-700">
                  {invalidRows.length} rows missing required fields (Name +
                  Phone) — will be skipped
                </p>
              </div>
              <div className="text-xs text-red-600 space-y-1">
                {invalidRows.slice(0, 5).map((r) => (
                  <p key={r.rowIndex}>
                    Row {r.rowIndex}: Missing{" "}
                    {!r.studentName ? "Student Name" : "Phone"}
                  </p>
                ))}
                {invalidRows.length > 5 && (
                  <p>...and {invalidRows.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setFile(null);
                setParsedRows([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleImport()}
              loading={importing}
              disabled={validRows.length === 0}
            >
              Import {validRows.length} Leads
            </Button>
          </div>
        </div>
      )}

      {/* Import result */}
      {result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-4">
            <CheckCircle2 size={28} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-base font-bold text-green-800">
                Import Complete!
              </p>
              <p className="text-sm text-green-700 mt-0.5">
                <strong>{result.imported.length}</strong> leads imported
                successfully.
                {result.duplicateQueue.length > 0 && (
                  <>
                    {" "}
                    <strong>{result.duplicateQueue.length}</strong> duplicates
                    queued for review.
                  </>
                )}
                {result.errors.length > 0 && (
                  <>
                    {" "}
                    <strong>{result.errors.length}</strong> rows had errors.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Duplicate queue */}
          {result.duplicateQueue.length > 0 && (
            <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-200 flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-500" />
                <p className="text-sm font-semibold text-gray-700">
                  Duplicate Review Queue ({result.duplicateQueue.length})
                </p>
              </div>
              <div className="divide-y divide-surface-100">
                {result.duplicateQueue.map((item) => (
                  <div
                    key={item.rowIndex}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {item.rowData.studentName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.rowData.phone} · Matched by {item.matchType}
                      </p>
                    </div>
                    <a
                      href={`/leads/${item.existingLeadId}`}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      View existing lead →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setFile(null);
                setResult(null);
                setParsedRows([]);
              }}
            >
              Import Another File
            </Button>
            <Button onClick={() => router.push("/leads")}>
              View All Leads
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
