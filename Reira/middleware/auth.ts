import type { Request, Response, NextFunction } from "express";
import redis from "@config/cache";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const email = await redis.get(`session:${sessionId}`);
  if (!email) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // attach user info to request
  (req as any).user = { email };
  next();
}
