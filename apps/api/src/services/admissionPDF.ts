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

    doc.rect(LEFT, 40, 100, 20).lineWidth(0.5).stroke();
    doc
      .fontSize(7)
      .font("Helvetica")
      .text("FE/ ........................", LEFT + 2, 45, { width: 96 });
    doc
      .fontSize(6)
      .fillColor("#666")
      .text("for office use only", LEFT + 2, 55, { width: 96 });
    doc.fillColor("#000");

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#006400")
      .text("FUTURE EDUCATION", LEFT + 100, 44, {
        width: 260,
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
        { width: 260, align: "center" },
      );
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#006400")
      .text("ADMISSION ASSISTANCE FORM", LEFT + 100, 79, {
        width: 260,
        align: "center",
      });
    doc.fillColor("#000");

    doc.rect(LEFT + 400, 40, 115, 70).lineWidth(0.5).stroke();
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("#666")
      .text("Please attach", LEFT + 402, 60, { width: 111, align: "center" })
      .text("recent passport", LEFT + 402, 70, { width: 111, align: "center" })
      .text("size photograph", LEFT + 402, 80, {
        width: 111,
        align: "center",
      });
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
      .text(
        "Name of the applicant (As per Matric record):",
        LEFT + 2,
        y + 3,
      );
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

    doc.fontSize(7).font("Helvetica-Bold").text("Sex:", LEFT + 2, y + 3);
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
      .text("Status:", LEFT + 82, y + 3);
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
      .text("Date of Birth:", LEFT + 182, y + 3);
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
      LEFT,
      y,
      90,
      W,
      16,
    );
    y += 16;
    labelValue(
      "",
      [lead.city, lead.district, lead.state].filter(Boolean).join(", "),
      LEFT,
      y,
      90,
      W,
      16,
    );
    y += 16;
    labelValue("Tel./Mob.", lead.phone, LEFT, y, 90, W / 2, 16);
    labelValue("Email", lead.email ?? "", LEFT + W / 2, y, 40, W / 2, 16);
    y += 16;
    labelValue(
      "Permanent Address",
      app?.permanentAddress ?? "",
      LEFT,
      y,
      90,
      W,
      16,
    );
    y += 16;
    labelValue("Tel./Mob.", app?.permanentPhone ?? "", LEFT, y, 90, W / 2, 16);
    labelValue(
      "Nationality",
      app?.nationality ?? "",
      LEFT + W / 2,
      y,
      60,
      W / 2,
      16,
    );
    y += 16;
    labelValue("Religion", app?.religion ?? "", LEFT, y, 60, W / 2, 16);
    labelValue(
      "Category",
      app?.category ?? "",
      LEFT + W / 2,
      y,
      60,
      W / 2,
      16,
    );
    y += 20;

    // ── FAMILY BACKGROUND ──
    doc
      .rect(LEFT, y, W, 14)
      .fillAndStroke("#005826", "#005826");
    doc
      .fillColor("#fff")
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Family Background:", LEFT + 2, y + 3);
    doc.fillColor("#000");

    const famHeaders = [
      "",
      "No. of Sisters",
      "Brothers",
      "Occupation",
      "Annual Income",
    ];
    const famWidths = [100, 80, 80, 130, 125];
    y += 14;
    let fx = LEFT;
    famHeaders.forEach((h, i) => {
      cell(h, fx, y, famWidths[i]!, 16);
      fx += famWidths[i]!;
    });
    y += 16;

    fx = LEFT;
    cell("Father's Name: " + (lead.fatherName ?? ""), fx, y, famWidths[0]!, 18);
    fx += famWidths[0]!;
    cell(String(app?.noOfSisters ?? ""), fx, y, famWidths[1]!, 18);
    fx += famWidths[1]!;
    cell(String(app?.noOfBrothers ?? ""), fx, y, famWidths[2]!, 18);
    fx += famWidths[2]!;
    cell(app?.fatherOccupation ?? "", fx, y, famWidths[3]!, 18);
    fx += famWidths[3]!;
    cell(
      app?.fatherIncome
        ? `₹${app.fatherIncome.toLocaleString("en-IN")}`
        : "",
      fx,
      y,
      famWidths[4]!,
      18,
    );
    y += 18;

    fx = LEFT;
    cell("Mother's Name: " + (app?.motherName ?? ""), fx, y, famWidths[0]!, 18);
    fx += famWidths[0]!;
    cell("", fx, y, famWidths[1]!, 18);
    fx += famWidths[1]!;
    cell("", fx, y, famWidths[2]!, 18);
    fx += famWidths[2]!;
    cell(app?.motherOccupation ?? "", fx, y, famWidths[3]!, 18);
    fx += famWidths[3]!;
    cell(
      app?.motherIncome
        ? `₹${app.motherIncome.toLocaleString("en-IN")}`
        : "",
      fx,
      y,
      famWidths[4]!,
      18,
    );
    y += 22;

    // ── ACADEMIC RECORD ──
    doc
      .rect(LEFT, y, W, 14)
      .fillAndStroke("#005826", "#005826");
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
      doc
        .rect(LEFT, y, W, 14)
        .fillAndStroke("#333", "#333");
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
      y += 6;
    }

    // ── PAGE 2: FOR OFFICE USE ONLY ──
    doc.addPage();
    y = 50;

    doc
      .rect(LEFT, y, W, 16)
      .fillAndStroke("#f0f0f0", "#000");
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
    labelValue(
      "Programme",
      lead.courses?.[0]?.course?.name ?? "",
      LEFT,
      y,
      70,
      W / 2,
      18,
    );
    labelValue(
      "Branch",
      lead.branch?.name ?? "",
      LEFT + W / 2,
      y,
      50,
      W / 2,
      18,
    );
    y += 18;

    labelValue(
      "College Booking Amt. Rs.",
      app?.bookingAmount ? `₹${app.bookingAmount}` : "",
      LEFT,
      y,
      130,
      W / 2,
      18,
    );
    labelValue(
      "Cash/DD No.",
      app?.bookingCashDDNo ?? "",
      LEFT + W / 2,
      y,
      70,
      W / 4,
      18,
    );
    labelValue(
      "Bank",
      app?.bookingBank ?? "",
      LEFT + (W * 3) / 4,
      y,
      40,
      W / 4,
      18,
    );
    y += 18;

    labelValue(
      "Admission Assistance Rs.",
      app?.admissionAmount ? `₹${app.admissionAmount}` : "",
      LEFT,
      y,
      130,
      W / 2,
      18,
    );
    labelValue(
      "Cash/DD No.",
      app?.admissionCashDDNo ?? "",
      LEFT + W / 2,
      y,
      70,
      W / 4,
      18,
    );
    labelValue(
      "Bank",
      app?.admissionBank ?? "",
      LEFT + (W * 3) / 4,
      y,
      40,
      W / 4,
      18,
    );
    y += 18;

    labelValue(
      "If any Dues Amt.",
      app?.duesAmount ? `₹${app.duesAmount}` : "",
      LEFT,
      y,
      100,
      W / 2,
      18,
    );
    labelValue(
      "Due Date",
      app?.dueDate
        ? new Date(app.dueDate).toLocaleDateString("en-IN")
        : "",
      LEFT + W / 2,
      y,
      60,
      W / 2,
      18,
    );
    y += 22;

    labelValue("Aadhar No.", app?.aadharNo ?? "", LEFT, y, 80, W / 2, 18);
    labelValue(
      "Apaar / ABC ID",
      app?.apaarId ?? "",
      LEFT + W / 2,
      y,
      90,
      W / 2,
      18,
    );
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
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-IN")}`,
      LEFT + 350,
      y,
    );

    // Watermark if not yet sent
    if (!app?.sentToStudentAt) {
      doc.save();
      doc
        .fontSize(40)
        .font("Helvetica-Bold")
        .fillColor("#e8e8e8")
        .rotate(-30, { origin: [LEFT + 220, 400] })
        .text("DRAFT", LEFT + 150, 350);
      doc.restore();
      doc.fillColor("#000");
    }

    doc.end();
  });
}
