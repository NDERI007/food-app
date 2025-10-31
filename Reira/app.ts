import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import session from "express-session";
import { RedisStore } from "connect-redis";
import apiRoutes from "./index";
import dotenv from "dotenv";
import { initializeSocket } from "@config/socketio";
import startOrderPoller from "@utils/poller";
import { startBatchScheduler } from "@utils/schedulerINT";
import { redis } from "@config/redis";

dotenv.config();

const app = express();

// Session middleware configuration
const sessionMiddleware = session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
});

app.use(cookieParser());
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.set("trust proxy", 1);
app.use(rateLimit({ windowMs: 60 * 1000, limit: 30 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply session middleware
app.use(sessionMiddleware);

// Mount routes
app.use("/api", apiRoutes);

// Create HTTP server (instead of app.listen)
const httpServer = createServer(app);

// Initialize Socket.IO with session middleware
initializeSocket(httpServer, sessionMiddleware);

// Start background services
startOrderPoller(); // Polls for paid orders every 60s
startBatchScheduler(); // Batches notifications every 60s

const PORT = parseInt(process.env.PORT || "8787", 10);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 BullMQ worker active`);
  console.log(`🔍 Order poller running (60s interval)`);
  console.log(`⏱️  Batch scheduler running (60s window)`);
  console.log(`🔌 Socket.IO ready for admin connections`);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  httpServer.close(() => {
    redis.quit();
    console.log("Server closed");
    process.exit(0);
  });
});

export default app;
