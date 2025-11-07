import express from "express";
import dotenv from "dotenv";
import orderNotificationWorker from "./Orderworker";
import { redis } from "@config/redis";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "10000", 10);

// Health check endpoint
app.get("/", (req, res) => {
  const isRunning = orderNotificationWorker.isRunning();
  res.status(isRunning ? 200 : 503).json({
    status: isRunning ? "healthy" : "unhealthy",
    worker: "order-notifications",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  const isRunning = orderNotificationWorker.isRunning();
  res.status(isRunning ? 200 : 503).json({
    status: isRunning ? "healthy" : "unhealthy",
    worker: "order-notifications",
  });
});

// Start HTTP server to keep process alive
app.listen(PORT, () => {
  console.log(`✅ Worker health server running on port ${PORT}`);
  console.log(`📦 BullMQ order-notifications worker active`);
  console.log(`💚 Health check available at /health`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down worker...");

  try {
    await orderNotificationWorker.close();
    await redis.quit();
    console.log("✅ Worker shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down worker...");

  try {
    await orderNotificationWorker.close();
    await redis.quit();
    console.log("✅ Worker shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
});

// Handle uncaught errors
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

console.log("🚀 Order notification worker started");
