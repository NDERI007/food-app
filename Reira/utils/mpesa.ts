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
// Send STK Push Request
// =====================================================
export async function stkPush(phone: string, amount: number, orderId: string) {
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
    CallBackURL: "https://cc4d1b74796d.ngrok-free.app/api/mpesa/callback",
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
