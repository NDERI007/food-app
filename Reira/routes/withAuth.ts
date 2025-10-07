import express from "express";
import crypto from "crypto";
import cache from "@config/cache";
import { sendOtpEmail } from "@utils/resend";
import { v4 as uuidv4 } from "uuid";
import rateLimit from "express-rate-limit";
import supabase from "@config/supabase";

const router = express.Router();

const OTP_TTL = 300; // 5 minutes
const RESEND_COOLDOWN = 30; // seconds
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const MAX_OTP_ATTEMPTS = 5; // Max verification attempts
const MAX_SEND_ATTEMPTS = 10; // Max OTP send attempts per hour
const ATTEMPT_WINDOW = 60 * 60; // 1 hour

router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 attempts
  message: { error: "Too many authentication attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
// Send OTP
router.post("/send-otp", authLimiter, async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  if (!email) return res.status(400).json({ error: "Email required" });

  const sendAttempts = parseInt(
    (await cache.get(`otp_send_attempts:${email}`)) || "0"
  );
  if (sendAttempts >= MAX_SEND_ATTEMPTS) {
    return res.status(429).json({
      error: "Too many OTP requests. Please try again later.",
    });
  }

  // Cooldown check
  const cooldownTTL = await cache.ttl(`otp_cooldown:${email}`);
  if (cooldownTTL > 0) {
    return res.status(429).json({
      error: `Please wait ${cooldownTTL}s before resending.`,
      retryAfter: cooldownTTL,
    });
  }
  const code = crypto.randomInt(100000, 999999).toString(); //store OTPs as strings (not integers) to avoid losing leading zeros (e.g. "045678").

  await cache.set(`otp:${email}`, code, OTP_TTL);

  // Store OTP
  await cache.set(`otp_cooldown:${email}`, "1", RESEND_COOLDOWN);

  try {
    await sendOtpEmail(email, code);
    // ✅ Only track a successful send attempt
    const newAttempts = await cache.incr(`otp_send_attempts:${email}`);
    await cache.expire(`otp_send_attempts:${email}`, ATTEMPT_WINDOW);

    // ✅ Only reset verify attempts after a successful send
    await cache.del(`otp_verify_attempts:${email}`);

    res.json({ message: "OTP sent!", attempts: newAttempts });
  } catch (err) {
    console.error("Failed to send OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Verify OTP
router.post("/verify-otp", authLimiter, async (req, res) => {
  let { email, code } = req.body;
  // Normalize email
  email = email?.toLowerCase().trim();
  code = code?.trim();
  if (!email || !code) {
    return res.status(400).json({ error: "Email and OTP required" });
  }
  const verifyAttempts = parseInt(
    (await cache.get(`otp_verify_attempts:${email}`)) || "0"
  );
  if (verifyAttempts >= MAX_OTP_ATTEMPTS) {
    const lockTTL = await cache.ttl(`otp_verify_attempts:${email}`);
    return res.status(429).json({
      error: "Too many failed attempts. Please request a new OTP.",
      retryAfter: lockTTL > 0 ? lockTTL : OTP_TTL,
    });
  }

  const storedCode = await cache.get(`otp:${email}`);
  if (!storedCode) return res.status(400).json({ error: "OTP expired" });
  if (storedCode !== code)
    return res.status(400).json({ error: "Invalid OTP" });
  // Timing-safe comparison
  const isValid =
    storedCode === code &&
    crypto.timingSafeEqual(
      Buffer.from(storedCode.padEnd(10, "0")),
      Buffer.from(code.padEnd(10, "0"))
    );

  if (!isValid) {
    // Increment failed attempts
    const newAttempts = await cache.incr(`otp_verify_attempts:${email}`);
    await cache.expire(`otp_verify_attempts:${email}`, OTP_TTL);

    const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - newAttempts);

    // If exceeded max attempts → lock
    if (newAttempts >= MAX_OTP_ATTEMPTS) {
      await cache.del(`otp:${email}`); // invalidate code
      return res.status(429).json({
        error: "Too many failed attempts. Please request a new OTP.",
        attemptsRemaining: 0,
      });
    }
    return res.status(400).json({
      error: "Invalid OTP",
      attemptsRemaining: remainingAttempts,
    });
  }

  // OTP valid → clean up
  await cache.del(`otp:${email}`);
  await cache.del(`otp_verify_attempts:${email}`);

  // Ensure user exists in Supabase (handled by function)
  try {
    const { error: rpcError } = await supabase.rpc("ensure_profile_exists", {
      email,
    });
    if (rpcError) {
      console.error("ensure_profile_exists error:", rpcError);
      return res.status(500).json({ error: "Profile creation failed." });
    }
  } catch (err) {
    console.error("RPC call failed:", err);
    return res.status(500).json({ error: "Unexpected server error." });
  }
  // just trust the trigger will handle user creation
  const sessionId = uuidv4();
  await cache.set(`session:${sessionId}`, email, SESSION_TTL);

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: SESSION_TTL * 1000,
    path: "/", //✅ Always sent to every route on your domain
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
