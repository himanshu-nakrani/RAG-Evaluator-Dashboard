import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { documentsTable, questionSetsTable, questionsTable, experimentsTable, evalRunsTable } from "@workspace/db";
import { count, max, avg, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [[{ totalDocuments }], [{ totalExperiments }], [{ totalRuns }], [{ totalQuestions }], recentRuns] =
      await Promise.all([
        db.select({ totalDocuments: count() }).from(documentsTable),
        db.select({ totalExperiments: count() }).from(experimentsTable),
        db.select({ totalRuns: count() }).from(evalRunsTable),
        db.select({ totalQuestions: count() }).from(questionsTable),
        db.select().from(evalRunsTable).orderBy(evalRunsTable.createdAt).limit(10),
      ]);

    const completedRuns = await db
      .select({ completedRuns: count() })
      .from(evalRunsTable)
      .where(eq(evalRunsTable.status, "completed"));

    const [{ bestFaithfulness, bestContextRecall, avgLatencyMs }] = await db
      .select({
        bestFaithfulness: max(evalRunsTable.avgFaithfulness),
        bestContextRecall: max(evalRunsTable.avgContextRecall),
        avgLatencyMs: avg(evalRunsTable.avgLatencyMs),
      })
      .from(evalRunsTable)
      .where(eq(evalRunsTable.status, "completed"));

    res.json({
      totalDocuments: Number(totalDocuments),
      totalQuestions: Number(totalQuestions),
      totalExperiments: Number(totalExperiments),
      totalRuns: Number(totalRuns),
      completedRuns: Number(completedRuns[0]?.completedRuns ?? 0),
      bestFaithfulness: bestFaithfulness ?? null,
      bestContextRecall: bestContextRecall ?? null,
      avgLatencyMs: avgLatencyMs ? Number(avgLatencyMs) : null,
      recentRuns: recentRuns.reverse(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
