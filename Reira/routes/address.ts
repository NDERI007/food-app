import supabase from "@config/supabase";
import express from "express";
import { requireAuth } from "middleware/auth";

const router = express.Router();

router.get("/look-up", requireAuth, async (req, res) => {
  try {
    const userID = req.user?.userID;

    if (!userID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data, error } = await supabase // Use service role client
      .from("addresses")
      .select("id, label, place_name, address")
      .eq("user_id", userID);

    if (error) throw error;

    res.json({ addresses: data || [] });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

export default router;
