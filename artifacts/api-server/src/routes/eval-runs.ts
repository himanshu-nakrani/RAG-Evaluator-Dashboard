import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  evalRunsTable,
  evalResultsTable,
  experimentsTable,
  questionsTable,
  documentsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// POST /experiments/:id/runs — trigger new eval run
router.post("/experiments/:id/runs", async (req, res) => {
  try {
    const experimentId = Number(req.params.id);
    const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, experimentId));
    if (!exp) {
      res.status(404).json({ error: "Experiment not found" });
      return;
    }

    const [run] = await db
      .insert(evalRunsTable)
      .values({ experimentId, status: "running" })
      .returning();

    // Simulate async eval — run in background
    simulateEvalRun(run.id, exp).catch(console.error);

    res.status(201).json(run);
  } catch (err) {
    req.log.error({ err }, "Failed to create eval run");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /eval-runs — list all runs (optionally filtered by experimentId)
router.get("/eval-runs", async (req, res) => {
  try {
    const experimentId = req.query.experimentId ? Number(req.query.experimentId) : undefined;
    const runs = experimentId
      ? await db
          .select()
          .from(evalRunsTable)
          .where(eq(evalRunsTable.experimentId, experimentId))
          .orderBy(evalRunsTable.createdAt)
      : await db.select().from(evalRunsTable).orderBy(evalRunsTable.createdAt);
    res.json(runs);
  } catch (err) {
    req.log.error({ err }, "Failed to list eval runs");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /eval-runs/:id — get run with detailed per-question results
router.get("/eval-runs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [run] = await db.select().from(evalRunsTable).where(eq(evalRunsTable.id, id));
    if (!run) {
      res.status(404).json({ error: "Eval run not found" });
      return;
    }
    const results = await db
      .select()
      .from(evalResultsTable)
      .where(eq(evalResultsTable.evalRunId, id))
      .orderBy(evalResultsTable.id);
    res.json({ ...run, results });
  } catch (err) {
    req.log.error({ err }, "Failed to get eval run");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Simulates a realistic RAG evaluation with deterministic-ish metrics based on config
export async function simulateEvalRun(
  runId: number,
  exp: typeof experimentsTable.$inferSelect
) {
  try {
    // Fetch questions for this experiment's question set
    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.questionSetId, exp.questionSetId));

    // Fetch document content
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, exp.documentId));

    if (!questions.length) {
      await db
        .update(evalRunsTable)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(evalRunsTable.id, runId));
      return;
    }

    // Simulate metrics based on config — larger chunks tend to have better recall, smaller better precision
    const chunkSizeFactor = Math.min(1, exp.chunkSize / 1024);
    const overlapBonus = Math.min(0.1, exp.chunkOverlap / exp.chunkSize);
    const topKFactor = Math.min(1, exp.topK / 10);

    const embeddingQuality: Record<string, number> = {
      "text-embedding-ada-002": 0.85,
      "text-embedding-3-small": 0.88,
      "text-embedding-3-large": 0.92,
      "all-MiniLM-L6-v2": 0.78,
      "bge-small-en": 0.80,
    };
    const retrieverQuality: Record<string, number> = {
      "dense": 0.86,
      "sparse": 0.78,
      "hybrid": 0.91,
      "mmr": 0.84,
    };

    const embeddingScore = embeddingQuality[exp.embeddingModel] ?? 0.80;
    const retrieverScore = retrieverQuality[exp.retrieverType] ?? 0.82;

    const results = [];
    for (const q of questions) {
      const baseLatency = 80 + chunkSizeFactor * 200 + exp.topK * 15;
      const latencyMs = baseLatency + (Math.random() * 80 - 40);

      // Faithfulness: how well the answer is grounded in retrieved context
      const faithfulness = Math.min(1, Math.max(0,
        embeddingScore * 0.5 + retrieverScore * 0.3 + overlapBonus + (Math.random() * 0.2 - 0.1)
      ));

      // Context recall: how much of the relevant ground truth is in the retrieved context
      const contextRecall = Math.min(1, Math.max(0,
        chunkSizeFactor * 0.3 + topKFactor * 0.4 + retrieverScore * 0.2 + (Math.random() * 0.2 - 0.1)
      ));

      // Simulate retrieval — extract a relevant chunk from the document
      const content = doc?.content ?? "";
      const chunkStart = Math.floor(Math.random() * Math.max(1, content.length - exp.chunkSize));
      const retrievedContext = content.slice(chunkStart, chunkStart + exp.chunkSize);

      const generatedAnswer = `Based on the retrieved context, ${q.text.toLowerCase().startsWith("what") ? "the answer is" : "it appears that"} the relevant information has been retrieved with a faithfulness score of ${faithfulness.toFixed(2)}.`;

      results.push({
        evalRunId: runId,
        questionId: q.id,
        questionText: q.text,
        retrievedContext: retrievedContext || "No content retrieved",
        generatedAnswer,
        faithfulness: Math.round(faithfulness * 1000) / 1000,
        contextRecall: Math.round(contextRecall * 1000) / 1000,
        latencyMs: Math.round(latencyMs * 10) / 10,
      });

      // Small delay to simulate real processing
      await new Promise((r) => setTimeout(r, 50));
    }

    // Insert all results
    await db.insert(evalResultsTable).values(results);

    // Compute averages
    const avgFaithfulness = results.reduce((sum, r) => sum + (r.faithfulness ?? 0), 0) / results.length;
    const avgContextRecall = results.reduce((sum, r) => sum + (r.contextRecall ?? 0), 0) / results.length;
    const avgLatencyMs = results.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / results.length;

    await db
      .update(evalRunsTable)
      .set({
        status: "completed",
        avgFaithfulness: Math.round(avgFaithfulness * 1000) / 1000,
        avgContextRecall: Math.round(avgContextRecall * 1000) / 1000,
        avgLatencyMs: Math.round(avgLatencyMs * 10) / 10,
        totalQuestions: results.length,
        completedAt: new Date(),
      })
      .where(eq(evalRunsTable.id, runId));
  } catch (err) {
    console.error("Eval run simulation failed:", err);
    await db
      .update(evalRunsTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(evalRunsTable.id, runId));
  }
}

export default router;
