import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { experimentsTable, evalRunsTable } from "@workspace/db";
import { eq, max, desc } from "drizzle-orm";

const router: IRouter = Router();

async function getLatestRunId(experimentId: number): Promise<number | null> {
  const [latest] = await db
    .select({ id: evalRunsTable.id })
    .from(evalRunsTable)
    .where(eq(evalRunsTable.experimentId, experimentId))
    .orderBy(desc(evalRunsTable.id))
    .limit(1);
  return latest?.id ?? null;
}

router.get("/experiments/compare", async (req, res) => {
  try {
    const id1 = Number(req.query.id1);
    const id2 = Number(req.query.id2);

    if (!id1 || !id2) {
      res.status(400).json({ error: "Both id1 and id2 are required" });
      return;
    }

    const [exp1] = await db
      .select()
      .from(experimentsTable)
      .where(eq(experimentsTable.id, id1));
    const [exp2] = await db
      .select()
      .from(experimentsTable)
      .where(eq(experimentsTable.id, id2));

    if (!exp1 || !exp2) {
      res.status(404).json({ error: "One or both experiments not found" });
      return;
    }

    const [metrics1] = await db
      .select({
        bestFaithfulness: max(evalRunsTable.avgFaithfulness),
        bestContextRecall: max(evalRunsTable.avgContextRecall),
        avgLatencyMs: max(evalRunsTable.avgLatencyMs),
      })
      .from(evalRunsTable)
      .where(eq(evalRunsTable.experimentId, id1));

    const [metrics2] = await db
      .select({
        bestFaithfulness: max(evalRunsTable.avgFaithfulness),
        bestContextRecall: max(evalRunsTable.avgContextRecall),
        avgLatencyMs: max(evalRunsTable.avgLatencyMs),
      })
      .from(evalRunsTable)
      .where(eq(evalRunsTable.experimentId, id2));

    const [latestRunId1, latestRunId2] = await Promise.all([
      getLatestRunId(id1),
      getLatestRunId(id2),
    ]);

    const runCount1 = (
      await db
        .select()
        .from(evalRunsTable)
        .where(eq(evalRunsTable.experimentId, id1))
    ).length;

    const runCount2 = (
      await db
        .select()
        .from(evalRunsTable)
        .where(eq(evalRunsTable.experimentId, id2))
    ).length;

    res.json({
      exp1: {
        id: exp1.id,
        name: exp1.name,
        chunkSize: exp1.chunkSize,
        embeddingModel: exp1.embeddingModel,
        retrieverType: exp1.retrieverType,
        topK: exp1.topK,
        isBlind: exp1.isBlind,
        latestRunId: latestRunId1,
        bestFaithfulness: metrics1?.bestFaithfulness ?? null,
        bestContextRecall: metrics1?.bestContextRecall ?? null,
        avgLatencyMs: metrics1?.avgLatencyMs ?? null,
        runCount: runCount1,
      },
      exp2: {
        id: exp2.id,
        name: exp2.name,
        chunkSize: exp2.chunkSize,
        embeddingModel: exp2.embeddingModel,
        retrieverType: exp2.retrieverType,
        topK: exp2.topK,
        isBlind: exp2.isBlind,
        latestRunId: latestRunId2,
        bestFaithfulness: metrics2?.bestFaithfulness ?? null,
        bestContextRecall: metrics2?.bestContextRecall ?? null,
        avgLatencyMs: metrics2?.avgLatencyMs ?? null,
        runCount: runCount2,
      },
      diff: {
        faithfulnessDiff:
          metrics1?.bestFaithfulness && metrics2?.bestFaithfulness
            ? metrics2.bestFaithfulness - metrics1.bestFaithfulness
            : null,
        recallDiff:
          metrics1?.bestContextRecall && metrics2?.bestContextRecall
            ? metrics2.bestContextRecall - metrics1.bestContextRecall
            : null,
        latencyDiff:
          metrics1?.avgLatencyMs && metrics2?.avgLatencyMs
            ? metrics2.avgLatencyMs - metrics1.avgLatencyMs
            : null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compare experiments");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
