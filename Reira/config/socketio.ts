import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import Redis from "ioredis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { socketAuthMiddleware } from "middleware/socketauth";
import { notificationService } from "@services/notification";

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

  // ✅ Handle admin socket connections
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

  console.log("✅ Socket.IO server initialized");

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

export const publishAdminNotification = async (data: any) => {
  try {
    await redisPublisher.publish("admin:notifications", JSON.stringify(data));
    console.log(`📤 Published admin notification`);
  } catch (error) {
    console.error("❌ Failed to publish admin notification:", error);
  }
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
  publishAdminNotification,
  closeSocketConnections,
};
