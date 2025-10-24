import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import apiRoutes from "index";

const app = express();

app.use(cookieParser());
app.use(helmet());
app.use(
  cors({
    origin: "https://iurafoods.vercel.app/", // your frontend
    credentials: true,
  })
);

app.use(rateLimit({ windowMs: 60 * 1000, limit: 30 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// mount routes
app.use("/api", apiRoutes);

const PORT = parseInt(process.env.PORT || "8787", 10);

app.listen(PORT, () => {
  console.log(`🚀 Autocomplete API running on http://localhost:${PORT}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

export default app;
