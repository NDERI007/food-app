import express from "express";
import crypto from "crypto";
import cache from "@config/cache";
import { sendOtpEmail } from "@utils/resend";
import { v4 as uuidv4 } from "uuid";
import rateLimit from "express-rate-limit";
import supabase from "@config/supabase";
import z, { email } from "zod";
import { signSessionId } from "@utils/hmacF";

const router = express.Router();

const OTP_TTL = 6000; // 5 minutes
const RESEND_COOLDOWN = 30; // seconds
export const SESSION_TTL = 60 * 60 * 2; // 2hrs
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
    const newAttempts = await cache.incr(`otp_send_attempts:${email}`);
    await cache.expire(`otp_send_attempts:${email}`, ATTEMPT_WINDOW);

    // Only reset verify attempts after a successful send
    await cache.del(`otp_verify_attempts:${email}`);

    res.json({ message: "OTP sent!" });
  } catch (err) {
    console.error("Failed to send OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Verify OTP
router.post("/verify-otp", authLimiter, async (req, res) => {
  let { email, code } = req.body;

  email = email?.toLowerCase().trim().replace(/\s+/g, "");
  // Remove ALL whitespace, zero-width chars, and non-digits
  code = code?.replace(/[\s\u200B-\u200D\uFEFF]/g, "").trim();

  // Validation
  if (!email || !code) {
    return res.status(400).json({ error: "Email and OTP required" });
  }

  // Validate OTP format (should be 6 digits)
  if (!/^\d{6}$/.test(code)) {
    return res
      .status(400)
      .json({ error: "Invalid OTP format. Must be 6 digits." });
  }

  // Check attempt limit
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

  // Get stored OTP
  const storedCode = await cache.get(`otp:${email}`);

  if (!storedCode) {
    return res.status(400).json({ error: "OTP expired or not found" });
  }

  // 🔧 FIX 2: Proper timing-safe comparison
  let isValid = false;
  try {
    // Ensure both are same length for timingSafeEqual
    const storedBuffer = Buffer.from(storedCode.padEnd(10, "0"));
    const codeBuffer = Buffer.from(code.padEnd(10, "0"));

    isValid = crypto.timingSafeEqual(storedBuffer, codeBuffer);
  } catch (err) {
    console.error("Timing-safe comparison error:", err);
    isValid = false;
  }

  if (!isValid) {
    // Increment failed attempts
    const newAttempts = await cache.incr(`otp_verify_attempts:${email}`);
    await cache.expire(`otp_verify_attempts:${email}`, OTP_TTL);

    const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - newAttempts);

    // Log for debugging (remove in production)
    console.log(
      `[OTP] Failed attempt for ${email}. Attempts: ${newAttempts}/${MAX_OTP_ATTEMPTS}`
    );

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
    const { data, error: rpcError } = await supabase.rpc(
      "ensure_profile_exists",
      {
        p_email: email,
      }
    );
    if (rpcError) {
      console.error("ensure_profile_exists error:", rpcError);
      return res.status(500).json({ error: "Profile creation failed." });
    }
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(500).json({ error: "No profile data returned." });
    }
    const { id: user_id, role } = data[0];

    // define a schema
    const userIdSchema = z.uuid();

    // parse once → gives you a plain string
    const userID: string = userIdSchema.parse(user_id);

    // just trust the trigger will handle user creation
    const sessionId = uuidv4();
    const signedId = signSessionId(sessionId);
    const sessionData = {
      userID,
      email,
      role: role,
      createdAt: Date.now(), // 🔹 timestamp in ms
    };
    try {
      await cache.set(
        `session:${signedId}`,
        JSON.stringify(sessionData),
        SESSION_TTL
      );
    } catch (cacheErr) {
      console.error("Failed to write session to cache:", cacheErr);
      // decide: proceed (recommended)
    }

    const cookieOptions = {
      httpOnly: true,
      secure: true, // ✅ Changed: Always true since Render uses HTTPS
      sameSite: "none" as const, // ✅ Changed: Always "none" for cross-origin
      maxAge: SESSION_TTL * 1000,
      path: "/",
    };

    res.cookie("sessionId", sessionId, cookieOptions);

    // This is CRITICAL - your frontend needs this data immediately
    return res.status(200).json({
      message: "Authenticated!",
      user: {
        email,
        role,
      },
      // Optional: for debugging cookie issues
      debug: {
        cookieSet: true,
        sessionCreated: true,
      },
    });
  } catch (err) {
    console.error("RPC call failed:", err);
    return res.status(500).json({
      error: "Unexpected server error.",
      code: "UNEXPECTED_ERROR",
    });
  }
});

//---CONTEXT-VERIFICATION ---
router.get("/context-verif", async (req, res) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.json({ authenticated: false, user: null });
  }

  const signedId = signSessionId(sessionId);
  const key = `session:${signedId}`;

  let raw;
  try {
    raw = await cache.get(key);
  } catch (err) {
    console.error("Redis error:", err);
    return res.json({ authenticated: false, user: null });
  }

  if (!raw) {
    res.clearCookie("sessionId");
    return res.json({ authenticated: false, user: null });
  }

  let sessionData: {
    userID: string;
    createdAt: number;
    email: string;
    role: string;
  };
  try {
    sessionData = JSON.parse(raw);
  } catch (parseErr) {
    console.error("Failed to parse session:", parseErr);
    await cache.del(key);
    res.clearCookie("sessionId");
    return res.json({ authenticated: false, user: null });
  }

  // Optional: manual max-age check
  const now = Date.now();
  const maxAgeMs = SESSION_TTL * 1000;

  if (now - sessionData.createdAt > maxAgeMs) {
    await cache.del(key);
    res.clearCookie("sessionId");
    return res.json({ authenticated: false, user: null });
  }

  // Refresh TTL (sliding session)
  try {
    await cache.expire(key, SESSION_TTL);
    // 🔁 Refresh browser cookie maxAge (2h sliding)
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: SESSION_TTL * 1000,
      path: "/",
    });
  } catch (err) {
    console.warn("Failed to refresh session TTL:", err);
  }

  return res.json({
    authenticated: true,
    user: { email: sessionData.email, role: sessionData.role },
  });
});

// --- LOGOUT ---
router.get("/logout", async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    const signedId = signSessionId(sessionId);
    await cache.del(`session:${signedId}`);
    res.clearCookie("sessionId");
  }
  res.json({ message: "Logged out!" });
});

export default router;
