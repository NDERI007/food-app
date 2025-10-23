import { v4 as uuidv4 } from 'uuid';

interface SessionToken {
  token: string;
  createdAt: number;
  usageCount: number;
}

class SessionTokenManager {
  private tokens: Map<string, SessionToken> = new Map();
  private readonly MAX_TOKEN_AGE = 3 * 60 * 1000; // 3 minutes
  private readonly GLOBAL_SESSION_KEY = '__global_places_session__';

  /**
   * Get or create global session token (shared across all components)
   */
  getGlobalToken(): string {
    const session = this.tokens.get(this.GLOBAL_SESSION_KEY);

    if (!session || this.isExpired(session)) {
      return this.createGlobalSession();
    }

    session.usageCount++;
    return session.token;
  }

  /**
   * Create new global session token
   */
  createGlobalSession(): string {
    const token = uuidv4();
    this.tokens.set(this.GLOBAL_SESSION_KEY, {
      token,
      createdAt: Date.now(),
      usageCount: 0,
    });
    console.log('🆕 Global session token:', token);
    return token;
  }

  /**
   * Terminate global session (called after Place Details)
   */
  terminateGlobalSession(): void {
    const session = this.tokens.get(this.GLOBAL_SESSION_KEY);
    if (session) {
      console.log(
        '✅ Session terminated after',
        session.usageCount,
        'autocomplete calls',
      );
    }
    this.tokens.delete(this.GLOBAL_SESSION_KEY);
    // Create new session for next search
    this.createGlobalSession();
  }

  private isExpired(session: SessionToken): boolean {
    return Date.now() - session.createdAt > this.MAX_TOKEN_AGE;
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [contextId, session] of this.tokens.entries()) {
      if (now - session.createdAt > this.MAX_TOKEN_AGE) {
        this.tokens.delete(contextId);
      }
    }
  }

  getGlobalSessionInfo(): SessionToken | undefined {
    return this.tokens.get(this.GLOBAL_SESSION_KEY);
  }
}

export const sessionTokenManager = new SessionTokenManager();

// Initialize global session
sessionTokenManager.createGlobalSession();

// Cleanup every minute
if (typeof window !== 'undefined') {
  setInterval(() => sessionTokenManager.cleanupExpired(), 60 * 1000);
}
