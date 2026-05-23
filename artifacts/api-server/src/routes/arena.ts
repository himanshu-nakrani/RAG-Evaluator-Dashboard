import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  arenaBattlesTable,
  experimentsTable,
  evalRunsTable,
  evalResultsTable,
  humanRatingsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { simulateEvalRun } from "./eval-runs";

const router: IRouter = Router();

const EXPERIMENT_CONFIG_FIELDS = [
  "chunkSize",
  "chunkOverlap",
  "embeddingModel",
  "retrieverType",
  "topK",
] as const;

function computeMetricWinner(runA: typeof evalRunsTable.$inferSelect, runB: typeof evalRunsTable.$inferSelect): "A" | "B" | "tie" {
  const aFaith = runA.avgFaithfulness ?? 0;
  const bFaith = runB.avgFaithfulness ?? 0;
  const aRecall = runA.avgContextRecall ?? 0;
  const bRecall = runB.avgContextRecall ?? 0;

  let aWins = 0;
  let bWins = 0;
  if (aFaith > bFaith) aWins++; else if (bFaith > aFaith) bWins++;
  if (aRecall > bRecall) aWins++; else if (bRecall > aRecall) bWins++;
  if (aWins > bWins) return "A";
  if (bWins > aWins) return "B";
  return "tie";
}

router.get("/arena/battles", async (req, res) => {
  try {
    const sessionId = req.header("x-session-id");
    if (!sessionId) {
      res.status(400).json({ error: "X-Session-Id header is required" });
      return;
    }
    const battles = await db
      .select()
      .from(arenaBattlesTable)
      .where(eq(arenaBattlesTable.sessionId, sessionId))
      .orderBy(arenaBattlesTable.createdAt);
    res.json(battles);
  } catch (err) {
    req.log.error({ err }, "Failed to list arena battles");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/arena/battles", async (req, res) => {
  try {
    const sessionId = req.header("x-session-id");
    if (!sessionId) {
      res.status(400).json({ error: "X-Session-Id header is required" });
      return;
    }

    const { name, documentId, questionSetId, configA, configB } = req.body;
    if (!name || !documentId || !questionSetId || !configA || !configB) {
      res.status(400).json({ error: "name, documentId, questionSetId, configA, configB are required" });
      return;
    }

    const [expA] = await db
      .insert(experimentsTable)
      .values({
        name: `${name} — A`,
        documentId,
        questionSetId,
        isBlind: true,
        ...configA,
      })
      .returning();

    const [expB] = await db
      .insert(experimentsTable)
      .values({
        name: `${name} — B`,
        documentId,
        questionSetId,
        isBlind: true,
        ...configB,
      })
      .returning();

    const [runA] = await db
      .insert(evalRunsTable)
      .values({ experimentId: expA.id, status: "running" })
      .returning();

    const [runB] = await db
      .insert(evalRunsTable)
      .values({ experimentId: expB.id, status: "running" })
      .returning();

    const [battle] = await db
      .insert(arenaBattlesTable)
      .values({
        name,
        sessionId,
        documentId,
        questionSetId,
        experimentAId: expA.id,
        experimentBId: expB.id,
        evalRunAId: runA.id,
        evalRunBId: runB.id,
        status: "running",
      })
      .returning();

    // Run both simulations in parallel
    Promise.all([
      simulateEvalRun(runA.id, expA),
      simulateEvalRun(runB.id, expB),
    ])
      .then(async () => {
        const [updatedA] = await db
          .select()
          .from(evalRunsTable)
          .where(eq(evalRunsTable.id, runA.id));
        const [updatedB] = await db
          .select()
          .from(evalRunsTable)
          .where(eq(evalRunsTable.id, runB.id));

        const metricWinner = computeMetricWinner(updatedA, updatedB);

        await db
          .update(arenaBattlesTable)
          .set({
            status: "completed",
            metricWinner,
            completedAt: new Date(),
          })
          .where(eq(arenaBattlesTable.id, battle.id));
      })
      .catch(async (err) => {
        console.error("Arena battle failed:", err);
        await db
          .update(arenaBattlesTable)
          .set({ status: "failed", completedAt: new Date() })
          .where(eq(arenaBattlesTable.id, battle.id));
      });

    res.status(201).json(battle);
  } catch (err) {
    req.log.error({ err }, "Failed to create arena battle");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/arena/battles/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [battle] = await db
      .select()
      .from(arenaBattlesTable)
      .where(eq(arenaBattlesTable.id, id));

    if (!battle) {
      res.status(404).json({ error: "Arena battle not found" });
      return;
    }

    const [expA] = await db
      .select()
      .from(experimentsTable)
      .where(eq(experimentsTable.id, battle.experimentAId));
    const [expB] = await db
      .select()
      .from(experimentsTable)
      .where(eq(experimentsTable.id, battle.experimentBId));

    let runABlind = null;
    let runBBlind = null;

    if (battle.evalRunAId) {
      const resultsA = await db
        .select({
          questionId: evalResultsTable.questionId,
          questionText: evalResultsTable.questionText,
          retrievedContext: evalResultsTable.retrievedContext,
          generatedAnswer: evalResultsTable.generatedAnswer,
        })
        .from(evalResultsTable)
        .where(eq(evalResultsTable.evalRunId, battle.evalRunAId))
        .orderBy(evalResultsTable.id);
      runABlind = { runId: battle.evalRunAId, questionResults: resultsA };
    }

    if (battle.evalRunBId) {
      const resultsB = await db
        .select({
          questionId: evalResultsTable.questionId,
          questionText: evalResultsTable.questionText,
          retrievedContext: evalResultsTable.retrievedContext,
          generatedAnswer: evalResultsTable.generatedAnswer,
        })
        .from(evalResultsTable)
        .where(eq(evalResultsTable.evalRunId, battle.evalRunBId))
        .orderBy(evalResultsTable.id);
      runBBlind = { runId: battle.evalRunBId, questionResults: resultsB };
    }

    const ratings = await db
      .select()
      .from(humanRatingsTable)
      .where(eq(humanRatingsTable.arenaBattleId, id));

    res.json({
      id: battle.id,
      name: battle.name,
      status: battle.status,
      metricWinner: battle.metricWinner,
      humanWinner: battle.humanWinner,
      expA: expA
        ? {
            id: expA.id,
            name: expA.name,
            chunkSize: expA.chunkSize,
            embeddingModel: expA.embeddingModel,
            retrieverType: expA.retrieverType,
            topK: expA.topK,
            isBlind: expA.isBlind,
            latestRunId: battle.evalRunAId,
            bestFaithfulness: null,
            bestContextRecall: null,
            avgLatencyMs: null,
            runCount: 0,
          }
        : null,
      expB: expB
        ? {
            id: expB.id,
            name: expB.name,
            chunkSize: expB.chunkSize,
            embeddingModel: expB.embeddingModel,
            retrieverType: expB.retrieverType,
            topK: expB.topK,
            isBlind: expB.isBlind,
            latestRunId: battle.evalRunBId,
            bestFaithfulness: null,
            bestContextRecall: null,
            avgLatencyMs: null,
            runCount: 0,
          }
        : null,
      runABlind,
      runBBlind,
      humanRatings: ratings,
      createdAt: battle.createdAt,
      completedAt: battle.completedAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get arena battle");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/arena/battles/:id/finalize", async (req, res) => {
  try {
    const sessionId = req.header("x-session-id");
    if (!sessionId) {
      res.status(400).json({ error: "X-Session-Id header is required" });
      return;
    }

    const id = Number(req.params.id);
    const { humanWinner } = req.body;

    if (!["A", "B", "tie"].includes(humanWinner)) {
      res.status(400).json({ error: "humanWinner must be A, B, or tie" });
      return;
    }

    const [battle] = await db
      .select()
      .from(arenaBattlesTable)
      .where(eq(arenaBattlesTable.id, id));

    if (!battle) {
      res.status(404).json({ error: "Arena battle not found" });
      return;
    }

    const [updated] = await db
      .update(arenaBattlesTable)
      .set({ humanWinner } as any)
      .where(eq(arenaBattlesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to finalize arena battle");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
