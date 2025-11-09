import supabase from "@config/supabase";
import { withAuth } from "middleware/auth";
import Express from "express";
import { notificationService } from "@services/adminnotification";
const router = Express.Router();

router.post("/share-to-rider", withAuth(["admin"]), async (req, res) => {
  try {
    const admin = req.user; // Get admin info from auth middleware
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({
        error: "orderID and rider_phone are required",
      });
    }

    // Update the order in database
    const { data: order, error } = await supabase
      .from("orders")
      .update({
        shared_to_rider: true,
        shared_at: new Date().toISOString(),
      })
      .eq("id", orderID)
      .select("id, payment_reference")
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(500).json({ error: "Failed to update order" });
    }

    // Notify all connected admins via Socket.IO
    await notificationService.notifyOrderShared({
      id: orderID,
      payment_reference: order.payment_reference,
      shared_by: admin?.email || "Admin",
    });

    return res.json({
      success: true,
      orderID,
      shared_to_rider: true,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
export default router;
