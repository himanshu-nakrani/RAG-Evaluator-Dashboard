import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { experimentsTable, evalRunsTable, evalResultsTable, questionsTable } from "@workspace/db";
import { eq, max, count, sql } from "drizzle-orm";
import { z } from "zod";
import { CreateExperimentBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/experiments", async (req, res) => {
  try {
    const experiments = await db.select().from(experimentsTable).orderBy(experimentsTable.createdAt);
    const withStats = await Promise.all(
      experiments.map(async (exp) => {
        const [{ runCount }] = await db
          .select({ runCount: count() })
          .from(evalRunsTable)
          .where(eq(evalRunsTable.experimentId, exp.id));
        const [{ bestFaithfulness, bestContextRecall }] = await db
          .select({
            bestFaithfulness: max(evalRunsTable.avgFaithfulness),
            bestContextRecall: max(evalRunsTable.avgContextRecall),
          })
          .from(evalRunsTable)
          .where(eq(evalRunsTable.experimentId, exp.id));
        return {
          ...exp,
          runCount: Number(runCount),
          bestFaithfulness: bestFaithfulness ?? null,
          bestContextRecall: bestContextRecall ?? null,
        };
      })
    );
    res.json(withStats);
  } catch (err) {
    req.log.error({ err }, "Failed to list experiments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/experiments", async (req, res) => {
  try {
    const body = CreateExperimentBody.parse(req.body);
    const [exp] = await db.insert(experimentsTable).values(body).returning();
    res.status(201).json({ ...exp, runCount: 0, bestFaithfulness: null, bestContextRecall: null });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create experiment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/experiments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, id));
    if (!exp) {
      res.status(404).json({ error: "Experiment not found" });
      return;
    }
    const runs = await db
      .select()
      .from(evalRunsTable)
      .where(eq(evalRunsTable.experimentId, id))
      .orderBy(evalRunsTable.createdAt);
    res.json({ ...exp, runs });
  } catch (err) {
    req.log.error({ err }, "Failed to get experiment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/experiments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(experimentsTable).where(eq(experimentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete experiment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/experiments/:id/compare", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, id));
    if (!exp) {
      res.status(404).json({ error: "Experiment not found" });
      return;
    }
    const runs = await db
      .select()
      .from(evalRunsTable)
      .where(eq(evalRunsTable.experimentId, id))
      .orderBy(evalRunsTable.createdAt);

    // Get all question IDs that appear in results for this experiment's runs
    const runIds = runs.map((r) => r.id);
    let metricsByQuestion: Array<{
      questionId: number;
      questionText: string;
      runMetrics: Array<{ runId: number; faithfulness: number | null; contextRecall: number | null; latencyMs: number | null }>;
    }> = [];

    if (runIds.length > 0) {
      const allResults = await db
        .select()
        .from(evalResultsTable)
        .where(sql`${evalResultsTable.evalRunId} = ANY(${sql.raw(`ARRAY[${runIds.join(",")}]`)})`)
        .orderBy(evalResultsTable.questionId);

      const questionMap = new Map<number, { questionId: number; questionText: string; runMetrics: Array<{ runId: number; faithfulness: number | null; contextRecall: number | null; latencyMs: number | null }> }>();
      for (const result of allResults) {
        if (!questionMap.has(result.questionId)) {
          questionMap.set(result.questionId, {
            questionId: result.questionId,
            questionText: result.questionText,
            runMetrics: [],
          });
        }
        questionMap.get(result.questionId)!.runMetrics.push({
          runId: result.evalRunId,
          faithfulness: result.faithfulness ?? null,
          contextRecall: result.contextRecall ?? null,
          latencyMs: result.latencyMs ?? null,
        });
      }
      metricsByQuestion = Array.from(questionMap.values());
    }

    res.json({
      experimentId: exp.id,
      experimentName: exp.name,
      runs: runs.map((r, i) => ({
        runId: r.id,
        runNumber: i + 1,
        status: r.status,
        avgFaithfulness: r.avgFaithfulness ?? null,
        avgContextRecall: r.avgContextRecall ?? null,
        avgLatencyMs: r.avgLatencyMs ?? null,
        createdAt: r.createdAt,
      })),
      metricsByQuestion,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compare experiment runs");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
