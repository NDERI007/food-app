import nodemailer from "nodemailer";

export async function sendEmail(to: string, code: string) {
  const transporter = nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 587,
    auth: { user: "apikey", pass: process.env.RESEND_API_KEY },
  });

  await transporter.sendMail({
    from: "no-reply@qualitechlabs.org",
    to,
    subject: "Your Login Code",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; background-color: #f9f9f9; padding: 30px; border-radius: 10px; max-width: 400px; margin: auto;">
  <h2 style="color: #333;">Hello there!</h2>
  <p style="font-size: 16px; color: #555;">Here's your login code to access your account:</p>
  <p style="font-size: 28px; font-weight: bold; color: #1a73e8; margin: 20px 0;">${code}</p>
  <p style="font-size: 14px; color: #999;">This code will expire in 5 minutes. Please use it soon.</p>
  <p style="font-size: 14px; color: #e53935; font-weight: bold; margin-top: 10px;">
    ⚠️ Do not share this code with anyone. We will never ask for it.
  </p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
  <p style="font-size: 12px; color: #999;">
    If you did not request this code, please ignore this email. No action is needed.
  </p>
</div>

    `,
  });
}
