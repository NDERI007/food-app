import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import Redis from "ioredis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { socketAuthMiddleware } from "middleware/socketauth";
import supabase from "./supabase";

dotenv.config();

// Separate connections for pub/sub
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

  // Subscribe to Redis pub/sub for admin notifications
  redisSubscriber.subscribe("admin:notifications", (err) => {
    if (err) {
      console.error("❌ Failed to subscribe to Redis:", err);
    } else {
      console.log("✅ Subscribed to admin:notifications channel");
    }
  });

  // Forward Redis messages to admin clients
  redisSubscriber.on("message", (channel, message) => {
    if (channel === "admin:notifications") {
      try {
        adminNamespace
          .to("admins")
          .emit("admin:notifications", JSON.parse(message));
      } catch (error) {
        console.error("❌ Failed to parse admin notification:", error);
      }
    }
  });

  // Handle admin connections
  adminNamespace.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`👤 Admin connected: ${user.email} (${socket.id})`);

    socket.on("subscribe", (channel: string) => {
      if (channel === "admin:notifications") {
        socket.join("admins");
        console.log(`✅ ${socket.id} joined admins room`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`👋 Admin disconnected: ${socket.id}`);
    });
  });

  return adminNamespace;
};

// =====================================================
// ORDERS NAMESPACE SETUP
// =====================================================
const setupOrdersNamespace = (io: Server) => {
  const ordersNamespace = io.of("/orders");

  // Apply middleware (any authenticated user)
  ordersNamespace.use(wrap(cookieParser()));
  ordersNamespace.use(socketAuthMiddleware());

  // Create separate Redis subscriber for orders
  const orderSubscriber = new Redis(process.env.REDIS_URL!, {
    retryStrategy: (times) => Math.min(times * 100, 2000),
  });

  orderSubscriber.psubscribe("order:*", (err) => {
    if (err) {
      console.error("❌ Failed to subscribe to order updates:", err);
    } else {
      console.log("✅ Subscribed to order:* pattern");
    }
  });

  // Forward order updates to specific users
  orderSubscriber.on("pmessage", (pattern, channel, message) => {
    const orderID = channel.split(":")[1];

    try {
      const data = JSON.parse(message);
      ordersNamespace.to(`order:${orderID}`).emit("order_update", data);
      console.log(`📦 Sent update for order ${orderID}`);
    } catch (error) {
      console.error("❌ Failed to parse order update:", error);
    }
  });

  // Handle order connections
  ordersNamespace.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`👤 User connected: ${user.email} (${socket.id})`);

    socket.on("join_order", async (orderID: string) => {
      const user = socket.data.user;

      // ✅ Verify the order belongs to the user
      const { data: order, error } = await supabase
        .from("orders")
        .select("id, user_id")
        .eq("id", orderID)
        .single();

      if (error || !order) {
        console.log(`❌ Order not found: ${orderID}`);
        return socket.emit("error", { message: "Order not found" });
      }

      if (order.user_id !== user.userID) {
        console.log(`🚫 Unauthorized order access attempt by ${user.email}`);
        return socket.emit("error", {
          message: "Not allowed to access this order",
        });
      }

      // ✅ Safe to join
      socket.join(`order:${orderID}`);
      console.log(`✅ ${user.email} joined order room: ${orderID}`);
      socket.emit("joined_order", { orderID, status: "connected" });
    });

    socket.on("leave_order", (orderID: string) => {
      socket.leave(`order:${orderID}`);
      console.log(`👋 ${user.email} left order room: ${orderID}`);
    });

    socket.on("disconnect", () => {
      console.log(`👋 User disconnected: ${socket.id}`);
    });
  });

  return ordersNamespace;
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
  setupOrdersNamespace(io);

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

export const publishOrderUpdate = async (orderID: string, data: any) => {
  try {
    await redisPublisher.publish(`order:${orderID}`, JSON.stringify(data));
    console.log(`📤 Published update for order ${orderID}`);
  } catch (error) {
    console.error("❌ Failed to publish order update:", error);
  }
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
  publishOrderUpdate,
  publishAdminNotification,
  closeSocketConnections,
};
