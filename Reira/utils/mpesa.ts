import fetch from "node-fetch";
import dotenv from "dotenv";

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
  NODE_ENV,
  SIMULATE_SUCCESS, // Add this to .env for easy toggle
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
// Send STK Push Request (with dev simulation)
// =====================================================
export async function stkPush(phone: string, amount: number, orderId: string) {
  // 🧪 DEV MODE: Simulate successful payment immediately
  if (NODE_ENV === "development" || SIMULATE_SUCCESS === "true") {
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

    // Simulate the callback after 3 seconds (mimics M-PESA delay)
    setTimeout(async () => {
      try {
        console.log(
          `🧪 Auto-triggering successful payment callback for order ${orderId}`
        );

        // Call your own callback endpoint to simulate success
        const callbackResponse = await fetch(
          "https://88a41e5757ff.ngrok-free.app/api/mpesa/callback-simulate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              checkoutRequestId: fakeCheckoutRequestId,
            }),
          }
        );

        if (!callbackResponse.ok) {
          const errorText = await callbackResponse.text();
          throw new Error(
            `Callback failed: ${callbackResponse.status} - ${errorText}`
          );
        }

        console.log(`✅ Simulated payment completed for order ${orderId}`);
      } catch (error) {
        console.error("❌ Failed to trigger simulated callback:", error);
      }
    }, 3000); // 3 second delay

    return fakeResponse;
  }

  // 🎯 PRODUCTION: Real M-PESA call
  const token = await getAccessToken();

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: MPESA_PASSKEY,
    Timestamp: "20160216165627",
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: "https://83ed26bf415d.ngrok-free.app/api/mpesa/callback",
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
