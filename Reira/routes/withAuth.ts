import express from "express";
import crypto from "crypto";
import cache from "@config/cache";
import { sendOtpEmail } from "@utils/resend";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

const OTP_TTL = 300; // 5 minutes
const RESEND_COOLDOWN = 30; // seconds
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

// Send OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  // cooldown check
  const lastSent = await cache.get(`otp_cooldown:${email}`);
  if (lastSent) {
    return res
      .status(429)
      .json({ error: `Please wait ${lastSent}s before resending.` });
  }

  const code = crypto.randomBytes(3).toString("hex");
  await cache.set(`otp:${email}`, code, OTP_TTL);
  await cache.set(
    `otp_cooldown:${email}`,
    RESEND_COOLDOWN.toString(),
    RESEND_COOLDOWN
  );

  try {
    await sendOtpEmail(email, code);
    res.json({ message: "OTP sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and OTP required" });
  }

  const storedCode = await cache.get(`otp:${email}`);
  if (!storedCode) return res.status(400).json({ error: "OTP expired" });
  if (storedCode !== code)
    return res.status(400).json({ error: "Invalid OTP" });

  // OTP valid → clean up
  await cache.del(`otp:${email}`);

  // just trust the trigger will handle user creation
  const sessionId = uuidv4();
  await cache.set(`session:${sessionId}`, email, SESSION_TTL);

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_TTL * 1000,
  });

  res.json({ message: "Authenticated!", email });
});

//---CONTEXT-VERIFICATION ---
router.get("/context-verif", async (req, res) => {
  // 🔑 Express automatically parses cookies via cookie-parser middleware
  const sessionId = req.cookies.sessionId; // Cookie is already here!

  if (!sessionId) {
    return res.json({ authenticated: false, user: null });
  }

  // Lookup session in Redis
  const email = await cache.get(`session:${sessionId}`);

  if (!email) {
    res.clearCookie("sessionId");
    return res.json({ authenticated: false, user: null });
  }

  res.json({ authenticated: true, user: { email } });
});

// --- LOGOUT ---
router.post("/logout", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    await cache.del(`session:${sessionId}`);
    res.clearCookie("sessionId");
  }
  res.json({ message: "Logged out!" });
});

export default router;
