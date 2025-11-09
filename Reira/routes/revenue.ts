import { withAuth } from "middleware/auth";
import express from "express";
import supabase from "@config/supabase";
const router = express.Router();

// Protected routes (auth required)
router.use(withAuth(["admin"]));

router.get("/today", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

    // Fetch today's orders and revenue
    const { data, error } = await supabase.rpc("get_dashboard_today", {
      p_day: today,
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    res.json(data);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics", withAuth(["admin"]), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Call the analytics RPC
    const { data, error } = await supabase.rpc("get_order_analytics", {
      start_date: startDate || null,
      end_date: endDate || null,
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      return res.status(500).json({ error: "Failed to fetch analytics" });
    }

    return res.json(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
