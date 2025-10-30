import express from "express";
import supabase from "@config/supabase";

const router = express.Router();

router.post("/callback", async (req, res) => {
  try {
    const body = req.body;

    if (!body?.Body?.stkCallback) {
      return res.status(400).json({ error: "Invalid callback body" });
    }

    const callback = body.Body.stkCallback;
    const metadataItems = callback.CallbackMetadata?.Item || [];
    const metadata: Record<string, any> = {};
    for (const item of metadataItems) {
      metadata[item.Name] = item.Value;
    }

    const transactionReference = metadata["MpesaReceiptNumber"] ?? null;
    const phoneNumber = metadata["PhoneNumber"] ?? null;
    const amount = metadata["Amount"] ?? null;
    const transactionDate = metadata["TransactionDate"] ?? null;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;
    const checkoutRequestId = callback.CheckoutRequestID;

    // ✅ Single transaction - insert mpesa record
    const { error: insertError } = await supabase
      .from("mpesa_transactions")
      .insert({
        checkout_request_id: checkoutRequestId,
        result_code: resultCode,
        result_desc: resultDesc,
        amount,
        transaction_reference: transactionReference,
        phone_number: phoneNumber,
        transaction_date: transactionDate,
        raw_response: body,
      });

    if (insertError) {
      console.error("❌ Supabase insert failed:", insertError);
    }

    // ✅ Update order if exists - single query with conditional update
    if (checkoutRequestId) {
      let paymentStatus = "unpaid";
      let orderStatus = "pending";

      if (resultCode === 0) {
        paymentStatus = "paid";
        orderStatus = "confirmed";
      } else if (resultCode === 1032) {
        paymentStatus = "cancelled";
        orderStatus = "payment_cancelled";
      } else {
        paymentStatus = "failed";
        orderStatus = "payment_failed";
      }

      // Direct update - no select needed
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: paymentStatus,
          payment_reference: transactionReference,
          status: orderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("checkout_request_id", checkoutRequestId);

      if (updateError) {
        console.error("Failed to update order:", updateError);
      } else {
        console.log(`Order updated to ${orderStatus}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: resultDesc,
      resultCode,
      transactionReference,
      phoneNumber,
      amount,
      transactionDate,
    });
  } catch (error) {
    console.error("Error handling M-PESA callback:", error);
    return res.status(200).json({ error: "Callback processing error" });
  }
});
export default router;
