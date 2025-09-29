import express from "express";
import crypto from "crypto";
import redis from "@config/redis";
import { sendEmail } from "@utils/resend";
import { getUserByEmail } from "@utils/getUser";

const router = express.Router();

const OTP_TTL = 300; // 5 minutes
const RESEND_COOLDOWN = 30; // seconds

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
    await sendEmail(email, code);
    res.json({ message: "OTP sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, code } = req.body;
  const storedCode = await redis.get(`otp:${email}`);

  if (!storedCode)
    return res.status(400).json({ error: "OTP expired or not found" });

  if (storedCode !== code)
    return res.status(400).json({ error: "Invalid OTP" });

  await redis.del(`otp:${email}`); // invalidate OTP

  const user = await getUserByEmail(email);

  if (!user) {
    return res.status(404).json({ error: "User not found in system" });
  }

  res.json({ message: "Logged in!" });
});

export default router;
