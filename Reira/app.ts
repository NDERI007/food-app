import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import placesRoutes from "./routes/places";
import authRoutes from "./routes/withAuth";

const app = express();

app.use(cookieParser());
app.use(helmet());
app.use(cors());

app.use(rateLimit({ windowMs: 60 * 1000, limit: 30 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// mount routes
app.use("/api", placesRoutes);
app.use("/auth", authRoutes);

export default app;
