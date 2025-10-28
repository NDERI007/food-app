import { Router } from "express";
import placesRoutes from "./routes/places";
import authRoutes from "./routes/withAuth";
import addrRoutes from "./routes/address";
import prodRoutes from "./routes/product";
import feedbackRoutes from "./routes/feedback";
import mpesaRoutes from "./routes/callbackMpesa";
import orderRoutes from "./routes/orders";

const router = Router();

// resource routes under /api/v1/places etc.
router.use("/places", placesRoutes);
router.use("/auth", authRoutes);
router.use("/addr", addrRoutes);
router.use("/prod", prodRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/mpesa", mpesaRoutes);
router.use("/orders", orderRoutes);

export default router;
