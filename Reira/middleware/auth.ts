import type { Request, Response, NextFunction } from "express";
import cache from "@config/cache";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        sessionId: string;
      };
    }
  }
}

// Middleware to check if user is authenticated
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).json({
      error: "Authentication required",
      authenticated: false,
    });
  }

  const email = await cache.get(`session:${sessionId}`);

  if (!email) {
    res.clearCookie("sessionId");
    return res.status(401).json({
      error: "Session expired",
      authenticated: false,
    });
  }

  // Attach user info to request
  req.user = { email, sessionId };
  next();
}

// Optional auth - doesn't block, just attaches user if available
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionId = req.cookies.sessionId;

  if (sessionId) {
    const email = await cache.get(`session:${sessionId}`);
    if (email) {
      req.user = { email, sessionId };
    }
  }

  next();
}
