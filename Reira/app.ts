import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import apiRoutes from "./index";
import dotenv from "dotenv";
import { initializeSocket } from "@config/socketio";
import { redis } from "@config/redis";

dotenv.config();

const app = express();

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

// Mount routes
app.use("/api", apiRoutes);

// Create HTTP server (instead of app.listen)
const httpServer = createServer(app);

// Initialize Socket.IO with session middleware
initializeSocket(httpServer);

const PORT = parseInt(process.env.PORT || "8787", 10);

// ✅ ONLY ONE listen() call
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
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
