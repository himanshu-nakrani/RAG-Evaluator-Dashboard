import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  presetsTable,
  experimentsTable,
  evalRunsTable,
  challengeAttemptsTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { simulateEvalRun } from "./eval-runs";

const router: IRouter = Router();

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashDate(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

router.get("/challenge/today", async (req, res) => {
  try {
    const presets = await db.select().from(presetsTable);
    if (!presets.length) {
      res.status(404).json({ error: "No presets available" });
      return;
    }
    const today = getTodayDate();
    const idx = hashDate(today) % presets.length;
    const preset = presets[idx];
    res.json({ date: today, preset });
  } catch (err) {
    req.log.error({ err }, "Failed to get today's challenge");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/challenge/today/start", async (req, res) => {
  try {
    const sessionId = req.header("x-session-id");
    if (!sessionId) {
      res.status(400).json({ error: "X-Session-Id header is required" });
      return;
    }

    const presets = await db.select().from(presetsTable);
    if (!presets.length) {
      res.status(404).json({ error: "No presets available" });
      return;
    }

    const today = getTodayDate();
    const idx = hashDate(today) % presets.length;
    const preset = presets[idx];

    const [exp] = await db
      .insert(experimentsTable)
      .values({
        name: `${preset.name} — Challenge ${today}`,
        chunkSize: preset.defaultChunkSize,
        chunkOverlap: preset.defaultChunkOverlap,
        embeddingModel: preset.defaultEmbeddingModel,
        retrieverType: preset.defaultRetrieverType,
        topK: preset.defaultTopK,
        documentId: preset.documentId,
        questionSetId: preset.questionSetId,
      })
      .returning();

    const [run] = await db
      .insert(evalRunsTable)
      .values({ experimentId: exp.id, status: "running" })
      .returning();

    const [attempt] = await db
      .insert(challengeAttemptsTable)
      .values({
        sessionId,
        presetId: preset.id,
        experimentId: exp.id,
        evalRunId: run.id,
        challengeDate: today,
      })
      .returning();

    simulateEvalRun(run.id, exp)
      .then(() => pollAndScore(attempt.id, run.id))
      .catch((err) => console.error("Challenge eval run failed:", err));

    res.status(201).json(attempt);
  } catch (err) {
    req.log.error({ err }, "Failed to start challenge");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/challenge/attempts", async (req, res) => {
  try {
    const sessionId = req.header("x-session-id");
    if (!sessionId) {
      res.status(400).json({ error: "X-Session-Id header is required" });
      return;
    }

    const attempts = await db
      .select()
      .from(challengeAttemptsTable)
      .where(eq(challengeAttemptsTable.sessionId, sessionId))
      .orderBy(asc(challengeAttemptsTable.createdAt));

    res.json(attempts);
  } catch (err) {
    req.log.error({ err }, "Failed to list challenge attempts");
    res.status(500).json({ error: "Internal server error" });
  }
});

async function pollAndScore(attemptId: number, runId: number) {
  const maxPolls = 60;
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const [run] = await db
      .select()
      .from(evalRunsTable)
      .where(eq(evalRunsTable.id, runId));

    if (!run || run.status === "failed") {
      await db
        .update(challengeAttemptsTable)
        .set({ score: 0 })
        .where(eq(challengeAttemptsTable.id, attemptId));
      return;
    }

    if (run.status === "completed") {
      const score = Math.round(
        (((run.avgFaithfulness ?? 0) + (run.avgContextRecall ?? 0)) / 2) * 100,
      );
      await db
        .update(challengeAttemptsTable)
        .set({ score })
        .where(eq(challengeAttemptsTable.id, attemptId));
      return;
    }
  }
}

export default router;
