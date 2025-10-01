import ejs from "ejs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// Equivalent of __filename and __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function previewEmail() {
  const templatePath = path.join(__dirname, "emails/templates/otp.ejs");

  const body = await ejs.renderFile(templatePath, {
    code: "123456",
    companyName: "MyApp",
    supportEmail: "support@myapp.com",
    subject: "Your login code",
    userName: "Kevs",
  });

  const layoutPath = path.join(__dirname, "emails/templates/layout.ejs");
  const html = await ejs.renderFile(layoutPath, {
    code: "123456",
    companyName: "MyApp",
    supportEmail: "support@myapp.com",
    subject: "Your login code",
    body,
  });

  fs.writeFileSync("preview.html", html, "utf8");
  console.log("✅ Preview generated at preview.html");
}

previewEmail();
