import nodemailer from "nodemailer";
import { config } from "../config";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export async function verifyEmailConnection(): Promise<boolean> {
  if (!config.smtp.user || !config.smtp.pass) {
    console.warn("⚠ Email not configured — set SMTP_USER and SMTP_PASS");
    return false;
  }

  try {
    await transporter.verify();
    console.log("✓ Email service connected");
    return true;
  } catch (error) {
    console.error("✗ Email service failed:", error);
    return false;
  }
}

function htmlWrapper(content: string): string {
  const logoUrl = `${config.frontendUrl}/logo.jpg`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Inter, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
      .card { background: white; border-radius: 12px; padding: 32px; max-width: 480px; margin: 0 auto; }
      .logo-wrap { margin-bottom: 24px; }
      .logo-img { display: block; width: 160px; height: auto; border: 0; }
      .title { font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 8px; }
      .body { font-size: 14px; color: #374151; line-height: 1.6; }
      .btn { display: inline-block; background: #005826; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
      .footer { font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      .highlight { background: #f0f9f4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo-wrap">
        <img class="logo-img" src="${logoUrl}" alt="Future Education Trust" />
      </div>
      ${content}
      <div class="footer">Future Education Trust · Bokaro Steel City<br>This is an automated email, please do not reply.</div>
    </div>
  </body>
  </html>`;
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function send(payload: EmailPayload): Promise<void> {
  if (!config.smtp.user || !config.smtp.pass) return;

  await transporter.sendMail({
    from: config.smtp.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}

export async function sendWelcomeSetupEmail(params: {
  to: string;
  name: string;
  role: string;
  setupUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Set up your FutureEd LMS account",
    html: htmlWrapper(`
      <div class="title">Welcome to FutureEd LMS, ${params.name}!</div>
      <div class="body">
        Your account has been created with the role of <strong>${params.role}</strong>.
        Please set your password to get started.
      </div>
      <a href="${params.setupUrl}" class="btn">Set My Password</a>
      <div class="body" style="color: #6b7280; font-size: 13px;">
        This link expires in 7 days. If you did not expect this email, please ignore it.
      </div>
    `),
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Reset your FutureEd LMS password",
    html: htmlWrapper(`
      <div class="title">Password Reset Request</div>
      <div class="body">Hi ${params.name}, we received a request to reset your password.</div>
      <a href="${params.resetUrl}" class="btn">Reset Password</a>
      <div class="body" style="color: #6b7280; font-size: 13px;">
        This link expires in 1 hour. If you did not request this, ignore this email.
      </div>
    `),
  });
}

export async function sendPasswordChangedEmail(params: {
  to: string;
  name: string;
  newPassword: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Your FutureEd LMS password has been reset",
    html: htmlWrapper(`
      <div class="title">Password Reset by Administrator</div>
      <div class="body">Hi ${params.name}, your password has been reset by an administrator.</div>
      <div class="highlight">
        <strong>New Password:</strong> <code>${params.newPassword}</code>
      </div>
      <div class="body">Please login and change your password immediately.</div>
      <a href="${config.frontendUrl}/login" class="btn">Login Now</a>
    `),
  });
}

export async function sendAccountDeactivatedEmail(params: {
  to: string;
  name: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Your FutureEd LMS account has been deactivated",
    html: htmlWrapper(`
      <div class="title">Account Deactivated</div>
      <div class="body">
        Hi ${params.name}, your account has been deactivated by an administrator.
        Please contact your manager if you believe this is an error.
      </div>
    `),
  });
}

export async function sendLeadAssignedEmail(params: {
  to: string;
  employeeName: string;
  studentName: string;
  phone: string;
  leadUrl: string;
  assignedByName: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Lead assigned: ${params.studentName}`,
    html: htmlWrapper(`
      <div class="title">New Lead Assigned to You</div>
      <div class="body">${params.assignedByName} has assigned a new lead to you.</div>
      <div class="highlight">
        <strong>Student:</strong> ${params.studentName}<br>
        <strong>Phone:</strong> ${params.phone}
      </div>
      <a href="${params.leadUrl}" class="btn">View Lead</a>
    `),
  });
}

export async function sendFollowUpReminderEmail(params: {
  to: string;
  employeeName: string;
  studentName: string;
  phone: string;
  leadUrl: string;
  overdueBy: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `⚠ Follow-up overdue: ${params.studentName}`,
    html: htmlWrapper(`
      <div class="title">Follow-up Overdue</div>
      <div class="body">A follow-up was scheduled and is now overdue.</div>
      <div class="highlight" style="background: #fef3c7; border-color: #fde68a;">
        <strong>Student:</strong> ${params.studentName}<br>
        <strong>Phone:</strong> ${params.phone}<br>
        <strong>Overdue by:</strong> ${params.overdueBy}
      </div>
      <a href="${params.leadUrl}" class="btn">Update Lead</a>
    `),
  });
}

export async function sendApplicationConfirmationEmail(params: {
  to: string;
  studentName: string;
  institutionName: string;
  programName: string;
  applicationNumber?: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Application submitted — ${params.institutionName}`,
    html: htmlWrapper(`
      <div class="title">Your Application Has Been Submitted</div>
      <div class="body">Dear ${params.studentName}, your application has been submitted successfully.</div>
      <div class="highlight">
        <strong>Institution:</strong> ${params.institutionName}<br>
        <strong>Program:</strong> ${params.programName}<br>
        ${params.applicationNumber ? `<strong>Application No:</strong> ${params.applicationNumber}` : ""}
      </div>
      <div class="body">Our team will keep you updated on the status. Please stay in touch with your counsellor.</div>
    `),
  });
}
