import { Socket } from "socket.io";
import cache from "@config/cache";
import { signSessionId } from "@utils/hmacF";

const MAX_SESSION_AGE = 60 * 60 * 24 * 7; // 7 DAYS
const SESSION_TTL = 60 * 60 * 24; // 24 hours

interface SessionData {
  userID: string;
  email: string;
  role: string;
  two_factor_enabled: boolean;
  createdAt: number;
}

export const socketAuthMiddleware = (requiredRole?: string) => {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      // Access parsed cookies (from cookie-parser middleware)
      const sessionId = (socket.request as any).cookies?.sessionId;

      if (!sessionId) {
        console.log("❌ No sessionId cookie found");
        return next(new Error("Authentication required"));
      }

      // Lookup signed session in Redis
      const key = `session:${signSessionId(sessionId)}`;
      const raw = await cache.get(key);

      if (!raw) {
        console.log("❌ Session not found in Redis:", key);
        return next(new Error("Session expired"));
      }

      let sessionData: SessionData;
      try {
        sessionData = JSON.parse(raw);
      } catch {
        console.log("❌ Invalid session data");
        await cache.del(key);
        return next(new Error("Invalid session data"));
      }

      // Enforce session lifetime
      if (Date.now() - sessionData.createdAt > MAX_SESSION_AGE * 1000) {
        console.log("❌ Session too old");
        await cache.del(key);
        return next(new Error("Session expired"));
      }

      // Role-based access control
      if (requiredRole && sessionData.role !== requiredRole) {
        console.log(
          `❌ Insufficient permissions. Required: ${requiredRole}, Got: ${sessionData.role}`
        );
        return next(new Error("Forbidden: insufficient permissions"));
      }

      // Refresh TTL (sliding session)
      try {
        await cache.expire(key, SESSION_TTL);
      } catch (err) {
        console.error("⚠️ Failed to refresh session TTL:", err);
      }

      // Attach user data to socket
      socket.data.user = {
        userID: sessionData.userID,
        email: sessionData.email,
        role: sessionData.role,
        sessionId,
      };

      console.log(
        `✅ Socket authenticated: ${sessionData.email} (${sessionData.role})`
      );
      next();
    } catch (error) {
      console.error("❌ Socket auth error:", error);
      next(new Error("Authentication failed"));
    }
  };
};
