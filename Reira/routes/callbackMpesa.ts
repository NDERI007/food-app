import supabase from "@config/supabase";
import express from "express";

const router = express.Router();

router.post("/callback", async (req, res) => {
  try {
    const body = req.body;

    if (!body?.Body?.stkCallback) {
      return res.status(400).json({ error: "Invalid callback body" });
    }

    const callback = body.Body.stkCallback;

    // Extract metadata
    const metadataItems = callback.CallbackMetadata?.Item || [];
    const metadata: Record<string, any> = {};
    for (const item of metadataItems) {
      metadata[item.Name] = item.Value;
    }

    // Key fields
    const transactionReference = metadata["MpesaReceiptNumber"] ?? null;
    const phoneNumber = metadata["PhoneNumber"] ?? null;
    const amount = metadata["Amount"] ?? null;
    const transactionDate = metadata["TransactionDate"] ?? null;

    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;
    const checkoutRequestId = callback.CheckoutRequestID;
    const merchantRequestId = callback.MerchantRequestID;

    // Log all responses (success or fail)
    await supabase.from("mpesa_transactions").insert({
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
      result_code: resultCode,
      result_desc: resultDesc,
      amount,
      transaction_reference: transactionReference,
      phone_number: phoneNumber,
      transaction_date: transactionDate,
      raw_response: body,
    });

    // If we can link this transaction to an order
    if (checkoutRequestId) {
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("id")
        .eq("checkout_request_id", checkoutRequestId)
        .single();

      if (!fetchError && order) {
        let paymentStatus = "unpaid";
        let orderStatus = "pending";

        // Map ResultCode to order states
        if (resultCode === 0) {
          paymentStatus = "paid";
          orderStatus = "confirmed";
        } else {
          paymentStatus = "failed";
          orderStatus = "payment_failed";
        }

        await supabase
          .from("orders")
          .update({
            payment_status: paymentStatus,
            payment_reference: transactionReference,
            mpesa_phone: phoneNumber,
            status: orderStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }
    }

    //Always send 200 OK to Safaricom (even if internal ops fail)
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
    // Still return 200 OK per Daraja’s requirement
    return res.status(200).json({ error: "Callback processing error" });
  }
});

export default router;
