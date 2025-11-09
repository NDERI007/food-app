import fetch from "node-fetch";
import dotenv from "dotenv";
import { processPaymentCallback } from "routes/callbackMpesa";

dotenv.config();

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_PASSKEY,
  MPESA_SHORTCODE,
  SIMULATE_SUCCESS,
} = process.env;

// =====================================================
// Get OAuth Access Token
// =====================================================
export async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as any;
  return data.access_token;
}

// =====================================================
// Process Simulated Callback (Direct - No HTTP)
// =====================================================
async function processSimulatedCallback(
  checkoutRequestId: string,
  orderId: string,
  amount: number,
  phone: string
): Promise<void> {
  console.log("🟡 Processing simulated callback for order:", orderId);

  const fakeTransactionReference = `FAKE${Math.random()
    .toString(36)
    .substring(2, 12)
    .toUpperCase()}`;

  const fakeTransactionDate = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);

  await processPaymentCallback({
    checkoutRequestId,
    resultCode: 0, // Success
    resultDesc: "The service request is processed successfully.",
    transactionReference: fakeTransactionReference,
    phoneNumber: phone,
    amount: amount,
    transactionDate: fakeTransactionDate,
    rawResponse: {
      simulated: true,
      note: "This is a fake transaction for development",
      orderId: orderId,
    },
  });

  console.log("🎉 Simulated payment processing complete");
}

// =====================================================
// Send STK Push Request (with dev simulation)
// =====================================================
export async function stkPush(
  phone: string,
  amount: number,
  orderId: string
): Promise<STKPushResponse> {
  // 🧪 DEV MODE: Simulate successful payment immediately
  if (SIMULATE_SUCCESS === "true") {
    console.log("🧪 DEV MODE: Simulating successful M-PESA payment");

    const fakeCheckoutRequestId = `ws_CO_${Date.now()}${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const fakeMerchantRequestId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Return fake successful STK push response
    const fakeResponse: STKPushResponse = {
      MerchantRequestID: fakeMerchantRequestId,
      CheckoutRequestID: fakeCheckoutRequestId,
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "Success. Request accepted for processing",
    };

    // ⚡ KEY FIX: Process callback directly (no HTTP request)
    setTimeout(async () => {
      try {
        console.log(
          `🔄 Auto-processing simulated payment for order ${orderId}`
        );

        await processSimulatedCallback(
          fakeCheckoutRequestId,
          orderId,
          amount,
          phone
        );

        console.log(`✅ Simulated payment completed for order ${orderId}`);
      } catch (error) {
        console.error("❌ Failed to process simulated callback:", error);
      }
    }, 3000); // 3 second delay

    return fakeResponse;
  }

  // 🎯 PRODUCTION: Real M-PESA call
  const token = await getAccessToken();

  // Generate proper timestamp
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: MPESA_PASSKEY,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: `${process.env.BASE_URL}/api/mpesa/callback`,
    AccountReference: orderId,
    TransactionDesc: `Order ${orderId}`,
  };

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`STK Push failed: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as STKPushResponse;
  return data;
}
