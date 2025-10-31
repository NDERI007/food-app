import supabase from "@config/supabase";
import express from "express";
import { withAuth } from "middleware/auth";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import { redis } from "@config/redis";

const router = express.Router();

router.use(withAuth());

router.post("/setup", async (req, res) => {
  try {
    const userID = req.user?.userID;
    if (!userID) return res.status(401).json({ message: "Unauthorized" });

    // Get user email for the QR code label
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userID)
      .single();

    if (!profile?.email) {
      return res.status(400).json({ message: "User email not found" });
    }

    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: `Iura (${profile.email})`,
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");

    // Store the secret temporarily (you might want to encrypt this)
    // For now, we'll return it and verify it before saving permanently
    return res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return res.status(500).json({ message: "Failed to setup 2FA" });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify the token and enable 2FA
 */
router.post("/verify", async (req, res) => {
  try {
    const userID = req.user?.userID;
    const { token, secret } = req.body;

    if (!userID) return res.status(401).json({ message: "Unauthorized" });
    if (!token || !secret) {
      return res.status(400).json({ message: "Token and secret required" });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Generate recovery codes
    const recoveryCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex")
    );

    // Hash recovery codes before storing
    const hashedCodes = recoveryCodes.map((code) =>
      crypto.createHash("sha256").update(code).digest("hex")
    );

    // Save 2FA settings to database
    const { error } = await supabase.from("profiles").upsert({
      id: userID,
      two_factor_secret: secret, // Consider encrypting this
      two_factor_enabled: true,
      recovery_codes: hashedCodes,
    });

    if (error) throw error;

    return res.json({
      success: true,
      message: "2FA enabled successfully",
      recoveryCodes, // Send unhashed codes to user (they need to save these)
    });
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    return res.status(500).json({ message: "Failed to verify 2FA" });
  }
});

router.post("/login-verify", async (req, res) => {
  try {
    const userID = req.user?.userID;
    if (!userID) return res.status(401).json({ error: "Unauthorized" });

    const { code, type } = req.body as { code?: string; type?: string };

    // Basic validation
    if (!type || (type !== "totp" && type !== "backup")) {
      return res.status(400).json({ error: "Invalid verification type" });
    }
    // ------------------------
    // Rate limiting: per user
    // ------------------------
    const attemptKey = `mfa-login-attempts:${userID}`;
    const userAttempts = await redis.incr(attemptKey);
    if (userAttempts === 1) await redis.expire(attemptKey, 60);
    if (userAttempts > 5) {
      return res
        .status(429)
        .json({ error: "Too many attempts. Try again in a minute." });
    }

    // ---------------------
    // TOTP verification
    // ---------------------
    if (type === "totp") {
      if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: "Invalid code format" });
      }

      // Fetch user's TOTP secret (assuming it's stored in profiles.two_factor_secret)
      const { data, error } = await supabase
        .from("profiles")
        .select("two_factor_secret")
        .eq("id", userID)
        .single();

      if (error || !data?.two_factor_secret) {
        return res
          .status(400)
          .json({ error: "TOTP secret not found for this user" });
      }

      const verified = speakeasy.totp.verify({
        secret: data.two_factor_secret,
        encoding: "base32",
        token: code,
        window: 1, // allow 1-step drift
      });

      if (!verified) {
        return res.status(400).json({
          error: "Invalid code. It may have expired or been mistyped.",
        });
      }

      // Success: clear attempt counters
      await redis.del(attemptKey);

      return res.json({ success: true });
    }

    // ---------------------
    // Backup/recovery code
    // ---------------------
    if (type === "backup") {
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Invalid backup code" });
      }

      // Fetch stored (hashed) recovery codes from profiles.recovery_codes
      const { data, error } = await supabase
        .from("profiles")
        .select("recovery_codes")
        .eq("id", userID)
        .single();

      if (error) {
        console.error("Failed to fetch recovery codes:", error);
        return res.status(500).json({ error: "Failed to verify backup code" });
      }

      const storedCodes: string[] | null = data?.recovery_codes ?? null;

      if (
        !storedCodes ||
        !Array.isArray(storedCodes) ||
        storedCodes.length === 0
      ) {
        return res
          .status(400)
          .json({ error: "No recovery codes found for this user" });
      }

      // Hash the provided code (your setup stored SHA-256)
      const hashed = crypto.createHash("sha256").update(code).digest("hex");

      // Check if hashed code exists
      if (!storedCodes.includes(hashed)) {
        return res.status(400).json({ error: "Invalid backup code" });
      }

      // Consume the code: remove it from list
      const updated = storedCodes.filter((c) => c !== hashed);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ recovery_codes: updated })
        .eq("id", userID);

      if (updateError) {
        console.error("Failed to consume backup code:", updateError);
        return res.status(500).json({ error: "Failed to consume backup code" });
      }

      // Success: clear attempts and respond
      await redis.del(attemptKey);
      return res.json({ success: true });
    }

    // fallback (shouldn't happen)
    return res.status(400).json({ error: "Invalid verification type" });
  } catch (err) {
    console.error("2FA verify error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for the user
 */
router.post("/disable", async (req, res) => {
  try {
    const userID = req.user?.userID;
    if (!userID) return res.status(401).json({ message: "Unauthorized" });

    const { error } = await supabase
      .from("profiles")
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        recovery_codes: null,
      })
      .eq("id", userID);

    if (error) throw error;

    return res.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    return res.status(500).json({ message: "Failed to disable 2FA" });
  }
});

/**
 * POST /api/auth/2fa/regenerate-codes
 * Regenerate recovery codes
 */
router.post("/regenerate-codes", async (req, res) => {
  try {
    const userID = req.user?.userID;
    if (!userID) return res.status(401).json({ message: "Unauthorized" });

    // Check if 2FA is enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("two_factor_enabled")
      .eq("id", userID)
      .single();

    if (!profile?.two_factor_enabled) {
      return res.status(400).json({ message: "2FA is not enabled" });
    }

    // Generate new recovery codes
    const recoveryCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex")
    );

    const hashedCodes = recoveryCodes.map((code) =>
      crypto.createHash("sha256").update(code).digest("hex")
    );

    const { error } = await supabase
      .from("profiles")
      .update({ recovery_codes: hashedCodes })
      .eq("id", userID);

    if (error) throw error;

    return res.json({
      success: true,
      recoveryCodes,
    });
  } catch (error) {
    console.error("Error regenerating codes:", error);
    return res.status(500).json({ message: "Failed to regenerate codes" });
  }
});

export default router;
