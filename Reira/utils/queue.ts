import { connection } from "@config/redis";
import { Queue } from "bullmq";

// Queue for order notifications
export const orderNotificationQueue = new Queue("order-notifications", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

// Job data interface
export interface OrderNotificationJob {
  orderId: string;
  userID: string;
  totalAmount: number;
  deliveryType: "pickup" | "delivery";
  createdAt: Date;
  mpesaPhone: string;
  paymentReference: string;
}

// Batch notification data stored in Redis
export interface BatchedNotifications {
  orders: OrderNotificationJob[];
  totalRevenue: number;
  lastUpdated: string;
}

export default orderNotificationQueue;
