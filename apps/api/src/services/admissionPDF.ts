import PDFDocument from "pdfkit";

export async function generateAdmissionPDF(lead: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const app = lead.confirmedApplication;
    const W = 515; // usable width
    const LEFT = 40;

    function cell(
      text: string,
      x: number,
      y: number,
      w: number,
      h: number,
      opts?: object,
    ) {
      doc.rect(x, y, w, h).lineWidth(0.5).stroke();
      doc
        .fontSize(8)
        .font("Helvetica")
        .text(text, x + 3, y + 3, { width: w - 6, height: h - 6, ...opts });
    }

    function labelValue(
      label: string,
      value: string,
      x: number,
      y: number,
      labelW: number,
      totalW: number,
      h = 18,
    ) {
      doc.rect(x, y, labelW, h).lineWidth(0.5).stroke();
      doc.rect(x + labelW, y, totalW - labelW, h).lineWidth(0.5).stroke();
      doc
        .fontSize(7)
        .font("Helvetica-Bold")
        .text(label, x + 2, y + 5, { width: labelW - 4 });
      doc
        .fontSize(8)
        .font("Helvetica")
        .text(value ?? "", x + labelW + 2, y + 5, {
          width: totalW - labelW - 4,
        });
    }

    // ── HEADER ──
    doc.rect(LEFT, 40, W, 70).lineWidth(1).stroke();

    // Left box — full header height, shows file number + admission ID
    doc.rect(LEFT, 40, 100, 70).lineWidth(0.5).stroke();
    doc
      .fontSize(6)
      .font("Helvetica-Bold")
      .fillColor("#444")
      .text("FILE NO.", LEFT + 3, 46, { width: 94 });
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#000")
      .text(app?.fileNumber ?? "___________", LEFT + 3, 56, { width: 94 });
    doc
      .fontSize(6)
      .font("Helvetica-Bold")
      .fillColor("#444")
      .text("ADM ID", LEFT + 3, 72, { width: 94 });
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#000")
      .text(app?.admissionId ?? "___________", LEFT + 3, 82, { width: 94 });
    doc
      .fontSize(6)
      .font("Helvetica")
      .fillColor("#888")
      .text("For Office Use Only", LEFT + 3, 99, { width: 94 });
    doc.fillColor("#000");

    // Center — title
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#006400")
      .text("FUTURE EDUCATION", LEFT + 100, 44, {
        width: 300,
        align: "center",
      });
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#000")
      .text(
        lead.branch?.address ??
          "HE-9, 1st Floor, City Centre, Sec-4, Bokaro Steel City - 827004",
        LEFT + 100,
        63,
        { width: 300, align: "center" },
      );
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#006400")
      .text("ADMISSION ASSISTANCE FORM", LEFT + 100, 81,
        { width: 300, align: "center" },
      );
    doc.fillColor("#000");

    // Right photo box
    doc.rect(LEFT + 400, 40, 115, 70).lineWidth(0.5).stroke();
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("#666")
      .text("Please attach", LEFT + 402, 60, { width: 111, align: "center" })
      .text("recent passport", LEFT + 402, 70, { width: 111, align: "center" })
      .text("size photograph", LEFT + 402, 80, { width: 111, align: "center" });
    doc.fillColor("#000");

    let y = 114;

    doc.rect(LEFT, y, W, 18).lineWidth(0.5).stroke();
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("BRANCH : ", LEFT + 2, y + 5);
    doc.font("Helvetica").text(lead.branch?.name ?? "", LEFT + 55, y + 5);
    y += 18;

    doc.rect(LEFT, y, W / 2, 18).lineWidth(0.5).stroke();
    doc.rect(LEFT + W / 2, y, W / 2, 18).lineWidth(0.5).stroke();
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Programme: ", LEFT + 2, y + 5, { continued: true })
      .font("Helvetica")
      .text(lead.courses?.[0]?.course?.name ?? "........................................");
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Branch: ", LEFT + W / 2 + 2, y + 5, { continued: true })
      .font("Helvetica")
      .text(lead.branch?.city ?? "");
    y += 18;

    // ── APPLICANT NAME ──
    doc.rect(LEFT, y, W, 14).lineWidth(0.5).stroke();
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Name of the applicant (As per Matric record):", LEFT + 2, y + 3);
    y += 14;

    const name = (lead.studentName ?? "").toUpperCase().padEnd(30, " ");
    const boxW = Math.floor(W / 30);
    for (let i = 0; i < 30; i++) {
      doc.rect(LEFT + i * boxW, y, boxW, 20).lineWidth(0.5).stroke();
      if (name[i] && name[i] !== " ") {
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(name[i]!, LEFT + i * boxW + 3, y + 5);
      }
    }
    y += 20;

    // ── SEX / STATUS / DOB ──
    doc.rect(LEFT, y, 80, 18).lineWidth(0.5).stroke();
    doc.rect(LEFT + 80, y, 100, 18).lineWidth(0.5).stroke();
    doc.rect(LEFT + 180, y, 335, 18).lineWidth(0.5).stroke();

    doc.fontSize(7).font("Helvetica-Bold").text("Sex:", LEFT + 2, y + 5);
    doc
      .fontSize(7)
      .font("Helvetica")
      .text(
        `${lead.gender === "MALE" ? "☑ Male" : "☐ Male"}   ${lead.gender === "FEMALE" ? "☑ Female" : "☐ Female"}`,
        LEFT + 20,
        y + 5,
      );

    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .text("Status:", LEFT + 82, y + 5);
    doc
      .fontSize(7)
      .font("Helvetica")
      .text(
        `${lead.maritalStatus === "MARRIED" ? "☑ Married" : "☐ Married"}  ${lead.maritalStatus === "SINGLE" ? "☑ Single" : "☐ Single"}`,
        LEFT + 105,
        y + 5,
      );

    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .text("Date of Birth:", LEFT + 182, y + 5);
    const dob = lead.dateOfBirth
      ? new Date(lead.dateOfBirth).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";
    doc.fontSize(8).font("Helvetica").text(dob, LEFT + 245, y + 5);
    y += 18;

    // ── ADDRESS ──
    labelValue(
      "Postal Address",
      [lead.village, lead.sector].filter(Boolean).join(", "),
      LEFT, y, 90, W, 16,
    );
    y += 16;
    labelValue(
      "",
      [lead.city, lead.district, lead.state].filter(Boolean).join(", "),
      LEFT, y, 90, W, 16,
    );
    y += 16;
    labelValue("Tel./Mob.", lead.phone, LEFT, y, 90, W / 2, 16);
    labelValue("Email", lead.email ?? "", LEFT + W / 2, y, 40, W / 2, 16);
    y += 16;
    labelValue("Permanent Address", app?.permanentAddress ?? "", LEFT, y, 90, W, 16);
    y += 16;
    labelValue("Tel./Mob.", app?.permanentPhone ?? "", LEFT, y, 90, W / 2, 16);
    labelValue("Nationality", app?.nationality ?? "", LEFT + W / 2, y, 60, W / 2, 16);
    y += 16;
    labelValue("Religion", app?.religion ?? "", LEFT, y, 60, W / 2, 16);
    labelValue("Category", app?.category ?? "", LEFT + W / 2, y, 60, W / 2, 16);
    y += 20;

    // ── FAMILY BACKGROUND ──
    doc.rect(LEFT, y, W, 14).fillAndStroke("#005826", "#005826");
    doc
      .fillColor("#fff")
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Family Background:", LEFT + 2, y + 3);
    doc.fillColor("#000");

    // Columns: Name (160) | Occupation (185) | Annual Income (170)
    const famWidths = [160, 185, 170];
    y += 14;
    let fx = LEFT;
    ["Name", "Occupation", "Annual Income"].forEach((h, i) => {
      cell(h, fx, y, famWidths[i]!, 16, { align: "center" });
      fx += famWidths[i]!;
    });
    y += 16;

    // Father row
    fx = LEFT;
    cell("Father's Name:  " + (lead.fatherName ?? ""), fx, y, famWidths[0]!, 18);
    fx += famWidths[0]!;
    cell(app?.fatherOccupation ?? "", fx, y, famWidths[1]!, 18);
    fx += famWidths[1]!;
    cell(
      app?.fatherIncome ? `₹${app.fatherIncome.toLocaleString("en-IN")}` : "",
      fx, y, famWidths[2]!, 18,
    );
    y += 18;

    // Mother row
    fx = LEFT;
    cell("Mother's Name:  " + (app?.motherName ?? ""), fx, y, famWidths[0]!, 18);
    fx += famWidths[0]!;
    cell(app?.motherOccupation ?? "", fx, y, famWidths[1]!, 18);
    fx += famWidths[1]!;
    cell(
      app?.motherIncome ? `₹${app.motherIncome.toLocaleString("en-IN")}` : "",
      fx, y, famWidths[2]!, 18,
    );
    y += 18;

    // Sisters / Brothers row
    fx = LEFT;
    cell("No. of Sisters:  " + String(app?.noOfSisters ?? ""), fx, y, famWidths[0]!, 16);
    fx += famWidths[0]!;
    cell("No. of Brothers:  " + String(app?.noOfBrothers ?? ""), fx, y, famWidths[1]!, 16);
    fx += famWidths[1]!;
    cell("", fx, y, famWidths[2]!, 16);
    y += 22;

    // ── ACADEMIC RECORD ──
    doc.rect(LEFT, y, W, 14).fillAndStroke("#005826", "#005826");
    doc
      .fillColor("#fff")
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Academic Record", LEFT + 2, y + 3);
    doc.fillColor("#000");
    y += 14;

    const acHeaders = [
      "Academic Level",
      "Subjects/Stream",
      "School/College/Institute",
      "Board/University",
      "Passing Year",
      "% of Marks/Grade",
    ];
    const acWidths = [75, 75, 140, 100, 65, 60];
    fx = LEFT;
    acHeaders.forEach((h, i) => {
      cell(h, fx, y, acWidths[i]!, 24, { align: "center" });
      fx += acWidths[i]!;
    });
    y += 24;

    const levels: Array<[string, string]> = [
      ["Matric / X Std.", "TENTH"],
      ["Inter / XII Std.", "TWELFTH"],
      ["Graduation / Equivalent", "GRADUATION"],
      ["PG / Equivalent", "POST_GRADUATION"],
    ];

    for (const [label, levelKey] of levels) {
      const rec = app?.academicRecords?.find((r: any) => r.level === levelKey);
      fx = LEFT;
      cell(label, fx, y, acWidths[0]!, 18);
      fx += acWidths[0]!;
      cell(rec?.stream ?? "", fx, y, acWidths[1]!, 18);
      fx += acWidths[1]!;
      cell(rec?.institution ?? "", fx, y, acWidths[2]!, 18);
      fx += acWidths[2]!;
      cell(rec?.board ?? "", fx, y, acWidths[3]!, 18);
      fx += acWidths[3]!;
      cell(rec?.passingYear?.toString() ?? "", fx, y, acWidths[4]!, 18);
      fx += acWidths[4]!;
      cell(rec?.percentage ? `${rec.percentage}%` : "", fx, y, acWidths[5]!, 18);
      y += 18;
    }
    y += 6;

    // ── ENTRANCE EXAMS ──
    if (app?.entranceExams?.length > 0) {
      doc.rect(LEFT, y, W, 14).fillAndStroke("#333", "#333");
      doc
        .fillColor("#fff")
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("Entrance Exams Details", LEFT + 2, y + 3);
      doc.fillColor("#000");
      y += 14;

      const exHeaders = ["Name of the exam", "Roll No.", "Score", "Rank"];
      const exWidths = [200, 100, 100, 115];
      fx = LEFT;
      exHeaders.forEach((h, i) => {
        cell(h, fx, y, exWidths[i]!, 16, { align: "center" });
        fx += exWidths[i]!;
      });
      y += 16;

      for (const exam of app.entranceExams) {
        fx = LEFT;
        cell(exam.examName, fx, y, exWidths[0]!, 16);
        fx += exWidths[0]!;
        cell(exam.rollNo ?? "", fx, y, exWidths[1]!, 16);
        fx += exWidths[1]!;
        cell(exam.score ?? "", fx, y, exWidths[2]!, 16);
        fx += exWidths[2]!;
        cell(exam.rank?.toString() ?? "", fx, y, exWidths[3]!, 16);
        y += 16;
      }
    }

    // ── PAGE 2 ──
    doc.addPage();
    y = 40;

    // ── RULES & REGULATIONS ──
    doc.rect(LEFT, y, W, 16).fillAndStroke("#005826", "#005826");
    doc
      .fillColor("#fff")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Rules & Regulations (General)", LEFT, y + 4, {
        width: W,
        align: "center",
      });
    doc.fillColor("#000");
    y += 16;

    const rulesBoxTop = y;

    const RULES = [
      "Application should be in prescribed format, with all the columns duly filled in by black/blue ink correctly and legible. Incomplete and Incorrect application may be outright rejected.",
      "Students are required to submit the attested xerox copies of their marksheet and eligibility certificate etc.",
      "The Processing fees, once paid will not be refunded in any circumstances.",
      "Student shall abide by the rules & regulations of the Future Education, as declared and notified from time to time.",
      "Students are not expected to indulge in any antisocial, criminal or political activities and conforming to his/her status as a student only.",
      "Student if found damaging the property of the organisation, they shall be punished and fined.",
      "In case of any disputes regarding student's affairs, they have to raise the disputes before the Authority of the Future Education and will be settled only by the Arbitration, the exclusive jurisdiction of competent court/forums of Bokaro Steel City only.",
      "In the event of student admitted to their own choice institute/college they shall abide by all the Rules and Regulations of the Institutes/Colleges/Universities.",
      "In case of any failure on the part of the students before admission or after admission, the Future Education will not be responsible.",
    ];

    y += 5;
    for (let i = 0; i < RULES.length; i++) {
      doc
        .fontSize(7.5)
        .font("Helvetica")
        .fillColor("#000")
        .text(`${i + 1}.  ${RULES[i]}`, LEFT + 8, y, {
          width: W - 16,
          align: "justify",
        });
      y = doc.y + 4;
    }

    y += 4;
    doc.rect(LEFT, rulesBoxTop, W, y - rulesBoxTop).lineWidth(0.5).stroke();

    // ── DECLARATION ──
    y += 10;
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("We, hereby declare that", LEFT, y);
    y += 14;
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .text(
        "a)  The information furnished above is correct on our best belief and will be liable for any action / legal action in case of data found false and forged.",
        LEFT + 8,
        y,
        { width: W - 16, align: "justify" },
      );
    y = doc.y + 5;
    doc
      .fontSize(7.5)
      .font("Helvetica")
      .text(
        "b)  We understood and abide by all the RULES & REGULATIONS of the Organisation.",
        LEFT + 8,
        y,
        { width: W - 16 },
      );
    y = doc.y + 18;

    // ── SIGNATURE FIELDS ──
    const sigColW = Math.floor(W / 3);
    doc
      .fontSize(8)
      .font("Helvetica")
      .text("Parent's / Guardian's Signature", LEFT, y, {
        width: sigColW,
        align: "center",
      });
    doc
      .fontSize(8)
      .font("Helvetica")
      .text("Date", LEFT + sigColW, y, { width: sigColW, align: "center" });
    doc
      .fontSize(8)
      .font("Helvetica")
      .text("Name & Signature of Applicant", LEFT + sigColW * 2, y, {
        width: sigColW,
        align: "center",
      });
    y += 30;
    // Signature lines
    doc.moveTo(LEFT + 10, y).lineTo(LEFT + sigColW - 10, y).lineWidth(0.5).stroke();
    doc.moveTo(LEFT + sigColW + 10, y).lineTo(LEFT + sigColW * 2 - 10, y).lineWidth(0.5).stroke();
    doc.moveTo(LEFT + sigColW * 2 + 10, y).lineTo(LEFT + W - 10, y).lineWidth(0.5).stroke();
    y += 20;

    // ── FOR OFFICE USE ONLY ──
    doc.moveTo(LEFT, y).lineTo(LEFT + W, y).lineWidth(1).stroke();
    y += 8;

    doc.rect(LEFT, y, W, 16).fillAndStroke("#f0f0f0", "#000");
    doc
      .fillColor("#000")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("FOR OFFICE USE ONLY", LEFT + 2, y + 4, {
        width: W,
        align: "center",
      });
    y += 16;

    labelValue("Candidate's Name", lead.studentName, LEFT, y, 110, W, 18);
    y += 18;
    labelValue("Programme", lead.courses?.[0]?.course?.name ?? "", LEFT, y, 70, W / 2, 18);
    labelValue("Branch", lead.branch?.name ?? "", LEFT + W / 2, y, 50, W / 2, 18);
    y += 18;

    labelValue(
      "College Booking Amt. Rs.",
      app?.bookingAmount ? `₹${app.bookingAmount}` : "",
      LEFT, y, 130, W / 2, 18,
    );
    labelValue("Cash/DD No.", app?.bookingCashDDNo ?? "", LEFT + W / 2, y, 70, W / 4, 18);
    labelValue("Bank", app?.bookingBank ?? "", LEFT + (W * 3) / 4, y, 40, W / 4, 18);
    y += 18;

    labelValue(
      "Admission Assistance Rs.",
      app?.admissionAmount ? `₹${app.admissionAmount}` : "",
      LEFT, y, 130, W / 2, 18,
    );
    labelValue("Cash/DD No.", app?.admissionCashDDNo ?? "", LEFT + W / 2, y, 70, W / 4, 18);
    labelValue("Bank", app?.admissionBank ?? "", LEFT + (W * 3) / 4, y, 40, W / 4, 18);
    y += 18;

    labelValue(
      "If any Dues Amt.",
      app?.duesAmount ? `₹${app.duesAmount}` : "",
      LEFT, y, 100, W / 2, 18,
    );
    labelValue(
      "Due Date",
      app?.dueDate ? new Date(app.dueDate).toLocaleDateString("en-IN") : "",
      LEFT + W / 2, y, 60, W / 2, 18,
    );
    y += 22;

    labelValue("Aadhar No.", app?.aadharNo ?? "", LEFT, y, 80, W / 2, 18);
    labelValue("Apaar / ABC ID", app?.apaarId ?? "", LEFT + W / 2, y, 90, W / 2, 18);
    y += 22;

    doc
      .fontSize(9)
      .font("Helvetica")
      .text("Authorised Signature: _______________________", LEFT, y);
    doc.text("Date: ________________", LEFT + 320, y);
    y += 30;

    doc.moveTo(LEFT, y).lineTo(LEFT + W, y).lineWidth(0.5).stroke();
    y += 10;

    doc
      .fontSize(8)
      .font("Helvetica")
      .text(`Counsellor: ${lead.assignedTo?.name ?? ""}`, LEFT, y);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, LEFT + 350, y);

    doc.end();
  });
}
