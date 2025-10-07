import { z } from "zod";
import express from "express";

/* ---------------- Places query schema + validation middleware ---------------- */

export const PlacesQuerySchema = z.object({
  q: z.string().min(1).max(200),
  // Express query params arrive as strings — transform to number | undefined
  limit: z
    .preprocess((v) => {
      if (typeof v === "string" && v.trim() !== "") return parseInt(v, 10);
      return undefined;
    }, z.number().int().min(1).max(20).optional())
    .optional()
    .default(10),

  sessionToken: z.uuidv4(),
});

export type PlacesQuery = z.infer<typeof PlacesQuerySchema>;

// Extend Express Request to hold parsedQuery (typed)
declare global {
  namespace Express {
    interface Request {
      parsedQuery?: PlacesQuery;
    }
  }
}

/**
 * validateQuery(schema)
 * - Applies safeQ to req.query.q before validation (caller may provide safeQ externally)
 * - If q is empty after safeQ, middleware attaches parsedQuery.q = "" and lets route handler
 *   decide behavior (keeps previous early-return semantics)
 * - On validation failure, returns 400 with structured issues
 */
export function validateQuery<T extends z.ZodTypeAny>(
  schema: T,
  opts?: { safeQ?: (s?: string) => string }
) {
  const safeQ =
    opts?.safeQ || ((s?: string) => (s ? String(s).trim().slice(0, 200) : ""));

  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const qProcessed = safeQ(req.query.q?.toString());

    if (!qProcessed) {
      // keep handler behavior simple: attach an explicit parsedQuery with empty q
      req.parsedQuery = { q: "" } as unknown as PlacesQuery;
      return next();
    }

    const toValidate = {
      q: qProcessed,
      limit: req.query.limit?.toString(),
      sessionToken: req.query.sessionToken?.toString(),
    };

    const result = schema.safeParse(toValidate);
    if (!result.success) {
      return res.status(400).json({
        error: "invalid_request",
        issues: z.treeifyError(result.error),
      });
    }

    req.parsedQuery = result.data as PlacesQuery;
    return next();
  };
}

export default validateQuery;
