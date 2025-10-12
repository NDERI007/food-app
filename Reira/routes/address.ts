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
    const { data, error } = await supabase
      .from("addresses")
      .upsert(
        {
          user_id: userID,
          label: label,
          place_name: place_name,
          address: address,
          place_id: place_id,
          lat: lat,
          lng: lng,
        },
        {
          onConflict: "user_id,place_id",
        }
      )
      .select();

    if (error) throw error;

    return res.json({
      success: true,
      message: "Address saved successfully",
      address: data?.[0] || null,
    });
  } catch (error) {
    console.error("Error saving address:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save address",
    });
  }
});
/**
 * DELETE /api/addresses/:id
 * Deletes a single address belonging to the authenticated user
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userID = req.user?.userID;
    const { id } = req.params;

    if (!userID) return res.status(401).json({ message: "Unauthorized" });
    if (!id) return res.status(400).json({ message: "Missing address ID" });

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", userID);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
});
export default router;
