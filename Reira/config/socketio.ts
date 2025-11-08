import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import Redis from "ioredis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { socketAuthMiddleware } from "middleware/socketauth";
import { notificationService } from "@services/adminnotification";
import { customerNotificationService } from "@services/clientnotification";

dotenv.config();

const redisSubscriber = new Redis(process.env.REDIS_URL!, {
  retryStrategy: (times) => Math.min(times * 100, 2000),
});

const redisPublisher = new Redis(process.env.REDIS_URL!, {
  retryStrategy: (times) => Math.min(times * 100, 2000),
});

let io: Server;

// Wrap Express middleware for Socket.IO
const wrap = (middleware: any) => (socket: Socket, next: any) =>
  middleware(socket.request, {} as any, next);

// =====================================================
// ADMIN NAMESPACE SETUP
// =====================================================
const setupAdminNamespace = (io: Server) => {
  const adminNamespace = io.of("/");

  // Apply middleware
  adminNamespace.use(wrap(cookieParser()));
  adminNamespace.use(socketAuthMiddleware("admin"));

  notificationService.subscribeToRedis((message) => {
    const { action, notification, orderId } = message;

    if (action === "new") {
      adminNamespace.to("admins").emit("admin:notifications:new", notification);
    } else if (action === "removed") {
      adminNamespace.to("admins").emit("admin:notifications:removed", orderId);
    }
  });

  // Handle admin socket connections
  adminNamespace.on("connection", async (socket) => {
    const user = socket.data.user;
    console.log(`👤 Admin connected: ${user.email} (${socket.id})`);

    socket.join("admins");

    try {
      // Send the active orders snapshot immediately
      const activeOrders = await notificationService.getActiveOrders();
      socket.emit("admin:notifications:replay", activeOrders);
      console.log(
        `📤 Sent ${activeOrders.length} active orders to ${user.email}`
      );
    } catch (err) {
      console.error("❌ Failed to load active orders:", err);
    }

    socket.on("disconnect", () => {
      console.log(`👋 Admin disconnected: ${socket.id}`);
    });
  });

  return adminNamespace;
};

// =====================================================
// CUSTOMER NAMESPACE SETUP
// =====================================================
const setupCustomerNamespace = (io: Server) => {
  const customerNamespace = io.of("/customer");

  // Apply middleware - authenticate customers
  customerNamespace.use(wrap(cookieParser()));
  customerNamespace.use(socketAuthMiddleware("user")); // or just "user"

  // Subscribe to payment confirmations from Redis
  customerNotificationService.subscribeToRedis((notification) => {
    const { userId, orderId } = notification.data;

    // Emit to specific user's room
    customerNamespace
      .to(`user:${userId}`)
      .emit("payment:confirmed", notification);

    console.log(`💳 Payment confirmation sent to user for order ${orderId}`);
  });

  // Handle customer socket connections
  customerNamespace.on("connection", async (socket) => {
    const user = socket.data.user;
    console.log(`👤 Customer connected: ${user.email} (${socket.id})`);

    // Join user-specific room for targeted notifications
    socket.join(`user:${user.userID}`);

    // Optional: Join order-specific room if they're tracking an order
    socket.on("track:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`📦 User tracking order ${orderId}`);
    });

    socket.on("untrack:order", (orderId: string) => {
      socket.leave(`order:${orderId}`);
      console.log(`📦 User stopped tracking order ${orderId}`);
    });

    socket.on("disconnect", () => {
      console.log(`👋 Customer disconnected: ${socket.id}`);
    });
  });

  return customerNamespace;
};

// =====================================================
// MAIN INITIALIZATION
// =====================================================
export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Setup namespaces
  setupAdminNamespace(io);
  setupCustomerNamespace(io);

  console.log(
    "✅ Socket.IO server initialized with admin and customer namespaces"
  );

  return io;
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

// Graceful shutdown
export const closeSocketConnections = async () => {
  if (io) {
    io.close();
    console.log("✅ Socket.IO server closed");
  }
  await redisSubscriber.quit();
  await redisPublisher.quit();
  console.log("✅ Redis connections closed");
};

export default {
  initializeSocket,
  getIO,
  closeSocketConnections,
};
