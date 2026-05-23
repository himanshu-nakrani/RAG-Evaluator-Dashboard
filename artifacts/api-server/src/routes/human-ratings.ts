import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { humanRatingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.post("/human-ratings", async (req, res) => {
  try {
    const sessionId = req.header("x-session-id");
    if (!sessionId) {
      res.status(400).json({ error: "X-Session-Id header is required" });
      return;
    }

    const { evalRunId, questionId, rating, preference, arenaBattleId } = req.body;

    if (!evalRunId || !questionId || typeof rating !== "number" || rating < 1 || rating > 5) {
      res.status(400).json({ error: "evalRunId, questionId, and rating (1-5) are required" });
      return;
    }

    const [upserted] = await db
      .insert(humanRatingsTable)
      .values({
        sessionId,
        evalRunId,
        questionId,
        rating,
        preference: preference ?? null,
        arenaBattleId: arenaBattleId ?? null,
      })
      .onConflictDoUpdate({
        target: [
          humanRatingsTable.sessionId,
          humanRatingsTable.evalRunId,
          humanRatingsTable.questionId,
        ],
        set: {
          rating,
          preference: preference ?? null,
          arenaBattleId: arenaBattleId ?? null,
        },
      })
      .returning();

    res.status(201).json(upserted);
  } catch (err) {
    req.log.error({ err }, "Failed to create/update human rating");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/human-ratings", async (req, res) => {
  try {
    const sessionId = req.header("x-session-id");
    if (!sessionId) {
      res.status(400).json({ error: "X-Session-Id header is required" });
      return;
    }

    const evalRunId = req.query.evalRunId ? Number(req.query.evalRunId) : undefined;

    const conditions = [eq(humanRatingsTable.sessionId, sessionId)];
    if (evalRunId) {
      conditions.push(eq(humanRatingsTable.evalRunId, evalRunId));
    }

    const ratings = await db
      .select()
      .from(humanRatingsTable)
      .where(and(...conditions))
      .orderBy(humanRatingsTable.createdAt);

    res.json(ratings);
  } catch (err) {
    req.log.error({ err }, "Failed to list human ratings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
