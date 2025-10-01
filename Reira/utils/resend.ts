import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import ejs from "ejs";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

// Equivalent of __filename and __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Generic email sender
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  const transporter = nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 587,
    auth: { user: "resend", pass: process.env.RESEND_KEY! },
  });

  const info = await transporter.sendMail({
    from: "noreply@qualitechlabs.org",
    to,
    subject,
    html,
    text,
  });

  console.log("✅ Email sent:", info.messageId);
}

// Render EJS template with layout
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

// Helper: generate a friendly name from email
function getNameFromEmail(email?: string) {
  if (!email) return "User"; // fallback if email is missing
  const namePart = email.split("@")[0] || "there";
  const displayName = namePart.replace(/[._]/g, " ");
  return displayName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Send OTP email
export async function sendOtpEmail(to: string, code: string) {
  const userName = getNameFromEmail(to);

  const html = (await renderEmail("otp.ejs", {
    code,
    companyName: "Iurafoods",
    supportEmail: "support@myapp.com",
    subject: "Your Iurafoods account verification code",
    userName,
  })) as string;

  await sendEmail(
    to,
    "Your Iurafoods account verification code",
    html,
    `Hello ${userName}, your login code is ${code}. It will expire in 5 minutes. If you didn’t request it, ignore this email.`
  );
}
