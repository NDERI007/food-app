import supabase from "@config/supabase";
import orderNotificationQueue from "./queue";
import { z } from "zod";
import { DateTime } from "luxon";

// Schema with automatic conversion of ISO strings → Date objects
const OrderSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  total_amount: z.union([z.number(), z.string().transform(Number)]),
  delivery_type: z.enum(["pickup", "delivery"]),
  payment_reference: z.string(),
  mpesa_phone: z.string(),
  created_at: z
    .string()
    .refine(
      (value) => DateTime.fromISO(value, { zone: "Africa/Nairobi" }).isValid,
      { message: "Invalid created_at timestamp" }
    )
    .transform((value) =>
      DateTime.fromISO(value, { zone: "Africa/Nairobi" }).toJSDate()
    ),
  updated_at: z
    .string()
    .refine(
      (value) => {
        const dt = DateTime.fromISO(value, { zone: "Africa/Nairobi" });
        return dt.isValid && dt <= DateTime.now();
      },
      { message: "Invalid or future updated_at timestamp" }
    )
    .transform((value) =>
      DateTime.fromISO(value, { zone: "Africa/Nairobi" }).toJSDate()
    ),
});

let lastCheckedAt = new Date();

export const startOrderPoller = () => {
  console.log("🔍 Order poller initialized");

  setInterval(async () => {
    try {
      const { data: newOrders, error } = await supabase
        .from("orders")
        .select(
          "id, user_id, total_amount, delivery_type, payment_reference, mpesa_phone, created_at, updated_at"
        )
        .eq("payment_status", "paid")
        .gte("updated_at", lastCheckedAt.toISOString())
        .order("updated_at", { ascending: true });

      if (error) throw error;

      if (newOrders?.length) {
        console.log(`📦 Found ${newOrders.length} new paid order(s)`);

        for (const rawOrder of newOrders) {
          const parsed = OrderSchema.safeParse(rawOrder);

          if (!parsed.success) {
            console.error("⚠️ Invalid order skipped:", parsed.error.flatten());
            continue;
          }

          const order = parsed.data;

          await orderNotificationQueue.add("new-paid-order", {
            orderId: order.id,
            userId: order.user_id,
            totalAmount: Number(order.total_amount),
            deliveryType: order.delivery_type,
            paymentReference: order.payment_reference,
            mpesaPhone: order.mpesa_phone,
            createdAt: order.created_at, // now a real Date object
          });
        }

        // Move cursor forward to latest timestamp
        lastCheckedAt = newOrders.at(-1)
          ? new Date(newOrders.at(-1)!.updated_at)
          : lastCheckedAt;
      }
    } catch (err) {
      console.error("❌ Order poller error:", err);
    }
  }, 60_000); // every 60 seconds
};

export default startOrderPoller;
