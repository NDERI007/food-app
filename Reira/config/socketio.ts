import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisSubscriber = new Redis(process.env.REDIS_URL!, {
  retryStrategy: (times) => Math.min(times * 100, 2000),
});

let io: Server;

export const initializeSocket = (
  httpServer: HTTPServer,
  sessionMiddleware: any
) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Use session middleware with Socket.IO
  const wrap = (middleware: any) => (socket: Socket, next: any) =>
    middleware(socket.request, {} as any, next);

  io.use(wrap(sessionMiddleware));

  // Verify admin role
  io.use((socket, next) => {
    const session = (socket.request as any).session;

    if (!session || !session.user) {
      return next(new Error("Unauthorized"));
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return next(new Error("Forbidden: Admin access required"));
    }

    next();
  });

  // Subscribe to Redis pub/sub
  redisSubscriber.subscribe("admin:notifications", (err) => {
    if (err) {
      console.error("❌ Failed to subscribe to Redis:", err);
    } else {
      console.log("✅ Subscribed to admin:notifications channel");
    }
  });

  // Forward Redis messages to Socket.IO clients
  redisSubscriber.on("message", (channel, message) => {
    if (channel === "admin:notifications") {
      io.to("admins").emit("admin:notifications", JSON.parse(message));
    }
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    const session = (socket.request as any).session;
    console.log(`👤 Admin connected: ${session.user.email} (${socket.id})`);

    socket.on("subscribe", (channel) => {
      if (channel === "admin:notifications") {
        socket.join("admins");
        console.log(`✅ ${socket.id} joined admins room`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`👋 Admin disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

export default { initializeSocket, getIO };
