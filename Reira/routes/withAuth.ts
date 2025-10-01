import express from "express";
import crypto from "crypto";
import redis from "@config/redis";
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
  const lastSent = await redis.get(`otp_cooldown:${email}`);
  if (lastSent) {
    return res
      .status(429)
      .json({ error: `Please wait ${lastSent}s before resending.` });
  }

  const code = crypto.randomBytes(3).toString("hex");
  await redis.set(`otp:${email}`, code, "EX", OTP_TTL);
  await redis.set(
    `otp_cooldown:${email}`,
    RESEND_COOLDOWN,
    "EX",
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

  const storedCode = await redis.get(`otp:${email}`);
  if (!storedCode) return res.status(400).json({ error: "OTP expired" });
  if (storedCode !== code)
    return res.status(400).json({ error: "Invalid OTP" });

  // OTP valid → clean up
  await redis.del(`otp:${email}`);

  // just trust the trigger will handle user creation
  const sessionId = uuidv4();
  await redis.set(`session:${sessionId}`, email, "EX", SESSION_TTL);

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_TTL * 1000,
  });

  res.json({ message: "Authenticated!", email });
});

// --- LOGOUT ---
router.post("/logout", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    await redis.del(`session:${sessionId}`);
    res.clearCookie("sessionId");
  }
  res.json({ message: "Logged out!" });
});

export default router;
