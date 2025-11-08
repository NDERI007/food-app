import { redis } from "@config/redis";

/* -----------------------------
   Customer Notification Service
   Notifies customers in real-time about payment status
----------------------------- */

export interface PaymentConfirmation {
  type: "PAYMENT_CONFIRMED";
  data: {
    orderId: string;
    userId: string;
    paymentReference: string;
    amount: number;
    status: "confirmed";
  };
  timestamp: string;
}

class CustomerNotificationService {
  private readonly channel = "customer:payments";

  /**
   * Notify customer about successful payment.
   * Publishes to Redis so all Socket.IO instances can relay it.
   */
  async notifyPaymentConfirmed(data: {
    orderId: string;
    userId: string;
    paymentReference: string;
    amount: number;
  }): Promise<void> {
    const notification: PaymentConfirmation = {
      type: "PAYMENT_CONFIRMED",
      data: {
        ...data,
        status: "confirmed",
      },
      timestamp: new Date().toISOString(),
    };

    try {
      await redis.publish(this.channel, JSON.stringify(notification));
      console.log(`📢 Payment confirmation sent to customer: ${data.userId}`);
    } catch (err) {
      console.error("❌ Failed to notify customer:", err);
      // Non-critical - customer will see it when they refresh anyway
    }
  }

  /**
   * Subscribe to Redis pub/sub for customer payment notifications.
   */
  subscribeToRedis(onMessage: (notification: PaymentConfirmation) => void) {
    const subscriber = redis.duplicate();

    subscriber.subscribe(this.channel, (err) => {
      if (err) {
        console.error("❌ Customer notification subscription failed:", err);
      } else {
        console.log(
          `📡 Listening on ${this.channel} for payment confirmations`
        );
      }
    });

    subscriber.on("message", (channel, message) => {
      if (channel !== this.channel) return;
      try {
        const notification = JSON.parse(message) as PaymentConfirmation;
        onMessage(notification);
      } catch (err) {
        console.error("❌ Invalid customer notification payload:", err);
      }
    });
  }
}

export const customerNotificationService = new CustomerNotificationService();
