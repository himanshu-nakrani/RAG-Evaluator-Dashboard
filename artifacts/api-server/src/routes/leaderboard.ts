import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { experimentsTable, evalRunsTable } from "@workspace/db";
import { eq, max, count, avg, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res) => {
  try {
    const experiments = await db
      .select()
      .from(experimentsTable)
      .orderBy(experimentsTable.createdAt);

    const entries = await Promise.all(
      experiments.map(async (exp) => {
        const runs = await db
          .select()
          .from(evalRunsTable)
          .where(eq(evalRunsTable.experimentId, exp.id))
          .orderBy(desc(evalRunsTable.createdAt));

        const completedRuns = runs.filter((r) => r.status === "completed");
        const [{ runCount }] = await db
          .select({ runCount: count() })
          .from(evalRunsTable)
          .where(eq(evalRunsTable.experimentId, exp.id));

        const bestFaithfulness =
          completedRuns.length > 0
            ? Math.max(...completedRuns.map((r) => r.avgFaithfulness ?? 0))
            : null;
        const bestContextRecall =
          completedRuns.length > 0
            ? Math.max(...completedRuns.map((r) => r.avgContextRecall ?? 0))
            : null;
        const avgLatencyMs =
          completedRuns.length > 0
            ? completedRuns.reduce((s, r) => s + (r.avgLatencyMs ?? 0), 0) / completedRuns.length
            : null;

        return {
          experimentId: exp.id,
          experimentName: exp.name,
          chunkSize: exp.chunkSize,
          embeddingModel: exp.embeddingModel,
          retrieverType: exp.retrieverType,
          topK: exp.topK,
          runCount: Number(runCount),
          bestFaithfulness: bestFaithfulness ?? null,
          bestContextRecall: bestContextRecall ?? null,
          avgLatencyMs: avgLatencyMs ?? null,
          latestRunStatus: runs[0]?.status ?? null,
        };
      })
    );

    const sorted = entries
      .sort((a, b) => (b.bestFaithfulness ?? -1) - (a.bestFaithfulness ?? -1))
      .map((e, i) => ({ rank: i + 1, ...e }));

    res.json({ entries: sorted, sortedBy: "bestFaithfulness" });
  } catch (err) {
    req.log.error({ err }, "Failed to build leaderboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
