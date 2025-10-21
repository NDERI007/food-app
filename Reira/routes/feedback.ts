import supabase from "@config/supabase";
import express from "express";
import { withAuth } from "middleware/auth";

const router = express.Router();

router.post("/insert", async (req, res) => {
  try {
    const { overall_rating, improvements, additional_comments } = req.body;

    // Validate required fields
    if (!overall_rating || !improvements) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (overall_rating, improvements)",
      });
    }

    const { data, error } = await supabase.from("feedback").insert([
      {
        overall_rating,
        improvements,
        additional_comments,
      },
    ]);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: data?.[0] || null,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
    });
  }
});

router.get("/look-up", withAuth(["admin"]), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      count: data.length,
      feedback: data,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedback",
    });
  }
});

export default router;
