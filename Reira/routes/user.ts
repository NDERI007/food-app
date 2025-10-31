import express from "express";
import supabase from "@config/supabase";
import { withAuth } from "middleware/auth";
import { signSessionId } from "@utils/hmacF";
import cache from "@config/cache";

const router = express.Router();

// Protected routes (auth required)
router.use(withAuth());

router.delete("/account", async (req, res) => {
  try {
    const userID = req.user?.userID;
    const sessionId = req.cookies.sessionId;

    if (!userID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (sessionId) {
      const signedId = signSessionId(sessionId);
      await cache.del(`session:${signedId}`);
    }

    // Delete the user's profile (this triggers cleanup_user_data via the trigger)
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userID);

    if (profileError) throw profileError;

    res.clearCookie("sessionId", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
});
export default router;
