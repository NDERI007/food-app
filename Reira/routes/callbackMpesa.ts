import supabase from "@config/supabase";
import { notificationService } from "@services/adminnotification";
import express from "express";

const router = express.Router();

// =====================================================
// SHARED: Process Payment Callback (Success or Failure)
// =====================================================
export async function processPaymentCallback(params: {
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  transactionReference: string | null;
  phoneNumber: string;
  amount: number;
  transactionDate: string;
  rawResponse?: any;
}): Promise<void> {
  const {
    checkoutRequestId,
    resultCode,
    resultDesc,
    transactionReference,
    phoneNumber,
    amount,
    transactionDate,
    rawResponse = {},
  } = params;

  console.log("🔄 Processing payment callback:", {
    checkoutRequestId,
    resultCode,
  });

  // 1. Insert M-PESA transaction record
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
      raw_response: rawResponse,
    });

  if (insertError) {
    console.error("❌ Failed to insert transaction:", insertError);
    throw insertError;
  }

  console.log("✅ Transaction inserted");

  // 2. Determine order status based on result code
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

  // 3. Update order
  const { data: orderData, error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: paymentStatus,
      payment_reference: transactionReference,
      status: orderStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("checkout_request_id", checkoutRequestId)
    .select();

  if (updateError) {
    console.error("❌ Failed to update order:", updateError);
    throw updateError;
  }

  console.log(`✅ Order updated to ${orderStatus}`);

  // 4. Send notifications only for successful payments
  if (orderData && orderData.length > 0 && resultCode === 0) {
    const order = orderData[0];

    if (order.status === "confirmed" && order.payment_status === "paid") {
      // Notify admin
      await notificationService.notifyConfirmedOrder({
        id: order.id,
        payment_reference: transactionReference || "N/A",
        amount: amount,
        phone_number: phoneNumber,
      });
      console.log("🔔 Notifications sent successfully");
    }
  }

  console.log("🎉 Payment callback processing complete");
}

// =====================================================
// REAL M-PESA CALLBACK (Production)
// =====================================================
router.post("/callback", async (req, res) => {
  console.log("📞 Real M-PESA callback received");

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

    // Extract data from M-PESA callback
    const transactionReference = metadata["MpesaReceiptNumber"] ?? null;
    const phoneNumber = metadata["PhoneNumber"] ?? null;
    const amount = metadata["Amount"] ?? null;
    const transactionDate = metadata["TransactionDate"] ?? null;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;
    const checkoutRequestId = callback.CheckoutRequestID;

    // Respond immediately to M-PESA
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

    // Process callback asynchronously
    if (checkoutRequestId) {
      await processPaymentCallback({
        checkoutRequestId,
        resultCode,
        resultDesc,
        transactionReference,
        phoneNumber,
        amount,
        transactionDate,
        rawResponse: body,
      });
    }
  } catch (error) {
    console.error("💥 Error handling M-PESA callback:", error);
    // Don't send error to M-PESA - already responded with 200
  }
});

// =====================================================
// SIMULATED CALLBACK (Development Only)
// =====================================================
router.post("/callback-simulate", async (req, res) => {
  console.log("🧪 Simulated callback triggered");

  const NODE_ENV = process.env.NODE_ENV || "development";

  if (NODE_ENV === "production") {
    return res.status(403).json({ error: "Not available in production" });
  }

  try {
    const { checkoutRequestId, amount, phone } = req.body;

    if (!checkoutRequestId) {
      return res.status(400).json({ error: "checkoutRequestId is required" });
    }

    // Generate fake data
    const fakeTransactionReference = `FAKE${Math.random()
      .toString(36)
      .substring(2, 12)
      .toUpperCase()}`;
    const fakePhoneNumber = phone || "254712345678";
    const fakeAmount = amount || 100;
    const fakeTransactionDate = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);

    // Respond immediately
    res.status(200).json({
      success: true,
      message: "Processing simulation...",
      transactionReference: fakeTransactionReference,
    });

    // Process using shared function
    await processPaymentCallback({
      checkoutRequestId,
      resultCode: 0, // Success
      resultDesc: "The service request is processed successfully.",
      transactionReference: fakeTransactionReference,
      phoneNumber: fakePhoneNumber,
      amount: fakeAmount,
      transactionDate: fakeTransactionDate,
      rawResponse: {
        simulated: true,
        note: "This is a fake transaction for development",
      },
    });

    console.log("🎉 Simulation complete");
  } catch (error) {
    console.error("💥 Simulation error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Simulation failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
});

export default router;
