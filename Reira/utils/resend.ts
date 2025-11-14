import { Resend } from "resend";
import dotenv from "dotenv";
import path from "path";
import ejs from "ejs";

dotenv.config();

const resend = new Resend(process.env.RESEND_KEY);

// Generic email sender - updated to use HTTP API
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  const { data, error } = await resend.emails.send({
    from: "Weddy's Kitchen <team@support.weddyskitchen.com>", //The format "Display Name <email@domain.com>" is the standard RFC 5322 format that Resend expects!
    to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error("❌ Email error:", error);
    throw error;
  }

  console.log("✅ Email sent:", data?.id);
  return data;
}

// Render EJS template with layout - NO CHANGES
async function renderEmail(template: string, data: any) {
  const templatePath = path.join(process.cwd(), "emails/templates", template);
  const content = await ejs.renderFile(templatePath, data);

  const layoutPath = path.join(process.cwd(), "emails/templates/layout.ejs");
  const html = await ejs.renderFile(layoutPath, {
    ...data,
    body: content,
  });

  return html;
}

// Helper: generate a friendly name from email - NO CHANGES
function getNameFromEmail(email?: string) {
  if (!email) return "User";
  const namePart = email.split("@")[0] || "there";
  const displayName = namePart.replace(/[._]/g, " ");
  return displayName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Send OTP email - NO CHANGES
export async function sendOtpEmail(to: string, code: string) {
  const userName = getNameFromEmail(to);

  const html = (await renderEmail("otp.ejs", {
    code,
    companyName: "Weddy's kitchen",
    supportContact: "0727942764",
    subject: "Your Weddy's kitchen account verification code",
    userName,
  })) as string;

  await sendEmail(
    to,
    "Your Weddy's kitchen account verification code",
    html,
    `Hello ${userName}, your login code is ${code}. It will expire in 5 minutes. If you didn't request it, ignore this email.`
  );
}
