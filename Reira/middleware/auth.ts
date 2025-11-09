import type { Request, Response, NextFunction } from "express";
import cache from "@config/cache";
import { SESSION_TTL } from "routes/withAuth";
import { signSessionId } from "@utils/hmacF";

const MAX_SESSION_AGE = 60 * 60 * 24 * 7; //7 DAYS
declare global {
  namespace Express {
    interface Request {
      user?: {
        userID: string;
        email: string;
        sessionId: string;
        role: string;
        two_factor_enabled: false;
      };
    }
  }
}

export function withAuth(requiredRoles?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) {
      return res
        .status(401)
        .json({ error: "Authentication required", authenticated: false });
    }

    // Lookup signed session in Redis
    const key = `session:${signSessionId(sessionId)}`;
    const raw = await cache.get(key);

    if (!raw) {
      res.clearCookie("sessionId");
      return res
        .status(401)
        .json({ error: "Session expired", authenticated: false });
    }

    let sessionData: {
      userID: string;
      email: string;
      role: string;
      two_factor_enabled: false;
      createdAt: number;
    };
    try {
      sessionData = JSON.parse(raw);
    } catch {
      await cache.del(key);
      res.clearCookie("sessionId");
      return res
        .status(401)
        .json({ error: "Invalid session data", authenticated: false });
    }

    // Enforce session lifetime
    if (Date.now() - sessionData.createdAt > MAX_SESSION_AGE * 1000) {
      await cache.del(key);
      res.clearCookie("sessionId");
      return res
        .status(401)
        .json({ error: "Session too old", authenticated: false });
    }

    // Refresh TTL (sliding session)
    try {
      await cache.expire(key, SESSION_TTL);
    } catch (err) {
      console.error("Failed to refresh session TTL:", err);
    }

    // Attach user to request
    req.user = {
      userID: sessionData.userID,
      email: sessionData.email,
      sessionId,
      role: sessionData.role,
      two_factor_enabled: sessionData.two_factor_enabled,
    };

    // Role-based access control
    if (requiredRoles && !requiredRoles.includes(sessionData.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden: insufficient permissions" });
    }

    next();
  };
}
