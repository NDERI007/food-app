import express from "express";
import supabase from "@config/supabase";
import { notificationService } from "@services/notification";

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

router.post("/callback-simulate", async (req, res) => {
  console.log("🔵 Callback endpoint hit");

  const NODE_ENV = process.env.NODE_ENV || "development";

  if (NODE_ENV === "production") {
    console.log("🔴 Production mode - rejecting");
    return res.status(403).json({ error: "Not available in production" });
  }

  try {
    console.log("🟢 Request body:", req.body);

    const { checkoutRequestId } = req.body;

    if (!checkoutRequestId) {
      console.log("🔴 Missing checkoutRequestId");
      return res.status(400).json({ error: "checkoutRequestId is required" });
    }

    console.log("🟡 Generating fake data...");
    const fakeTransactionReference = `FAKE${Math.random()
      .toString(36)
      .substring(2, 12)
      .toUpperCase()}`;
    const fakePhoneNumber = "254712345678";
    const fakeAmount = 100;
    const fakeTransactionDate = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);

    console.log("🟡 Inserting transaction...");
    const { data, error: insertError } = await supabase
      .from("mpesa_transactions")
      .insert({
        checkout_request_id: checkoutRequestId,
        result_code: 0,
        result_desc: "The service request is processed successfully.",
        amount: fakeAmount,
        transaction_reference: fakeTransactionReference,
        phone_number: fakePhoneNumber,
        transaction_date: fakeTransactionDate,
        raw_response: {
          simulated: true,
          note: "This is a fake transaction for development",
        },
      })
      .select();

    if (insertError) {
      console.error("🔴 Insert error:", insertError);
      return res.status(500).json({
        error: "Failed to simulate payment",
        details: insertError.message,
        code: insertError.code,
      });
    }

    console.log("🟢 Transaction inserted:", data);
    console.log("🟡 Updating order...");

    const { data: orderData, error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_reference: fakeTransactionReference,
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("checkout_request_id", checkoutRequestId)
      .select();

    if (updateError) {
      console.error("🔴 Update error:", updateError);
      return res.status(500).json({
        error: "Failed to update order",
        details: updateError.message,
      });
    }

    console.log("🟢 Order updated:", orderData);

    // ✨ Notify admins about confirmed order via Socket.IO + Redis
    if (orderData && orderData.length > 0) {
      const order = orderData[0];

      // Only notify when order is confirmed and paid
      if (order.status === "confirmed" && order.payment_status === "paid") {
        await notificationService.notifyConfirmedOrder({
          id: order.id,
          payment_reference: fakeTransactionReference,
          amount: fakeAmount,
          phone_number: fakePhoneNumber,
        });
      }
    }

    console.log("🎉 Sending success response");

    return res.status(200).json({
      success: true,
      message: "Payment simulated successfully",
      transactionReference: fakeTransactionReference,
      checkoutRequestId,
    });
  } catch (error) {
    console.error("💥 CATCH BLOCK ERROR:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Simulation error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
});

export default router;
