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
/**
 * POST /api/addr/save
 * Upsert address using RPC (stored procedure)
 */
router.post("/upsert", requireAuth, async (req, res) => {
  try {
    const userID = req.user?.userID;

    if (!userID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { label, place_name, address, place_id, lat, lng } = req.body;

    // Validate required fields
    if (!label || !place_id || !place_name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (label, place_name, place_id)",
      });
    }

    // Call RPC to insert/update the address
    const { error } = await supabase.rpc("upsert_address", {
      p_user_id: userID,
      p_label: label,
      p_place_name: place_name,
      p_address: address || null,
      p_place_id: place_id,
      p_lat: lat ?? null,
      p_lng: lng ?? null,
    });

    if (error) throw error;

    return res.json({
      success: true,
      message: "Address saved successfully",
    });
  } catch (error) {
    console.error("Error saving address:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save address",
    });
  }
});
export default router;
