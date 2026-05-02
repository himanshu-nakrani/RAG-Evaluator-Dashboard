import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sweepsTable, experimentsTable, evalRunsTable } from "@workspace/db";
import { eq, max, count, sql } from "drizzle-orm";
import { z } from "zod";
import { CreateSweepBody } from "@workspace/api-zod";
import { simulateEvalRun } from "./eval-runs.js";

const router: IRouter = Router();

router.get("/sweeps", async (req, res) => {
  try {
    const sweeps = await db.select().from(sweepsTable).orderBy(sweepsTable.createdAt);
    res.json(sweeps);
  } catch (err) {
    req.log.error({ err }, "Failed to list sweeps");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sweeps", async (req, res) => {
  try {
    const body = CreateSweepBody.parse(req.body);
    const {
      name,
      documentId,
      questionSetId,
      chunkSizes,
      embeddingModels,
      retrieverTypes,
      topK,
      chunkOverlap,
      autoRun,
    } = body;

    const combinations: Array<{
      chunkSize: number;
      embeddingModel: string;
      retrieverType: string;
    }> = [];
    for (const chunkSize of chunkSizes) {
      for (const embeddingModel of embeddingModels) {
        for (const retrieverType of retrieverTypes) {
          combinations.push({ chunkSize, embeddingModel, retrieverType });
        }
      }
    }

    const [sweep] = await db
      .insert(sweepsTable)
      .values({
        name,
        documentId,
        questionSetId,
        status: "running",
        totalExperiments: combinations.length,
        completedExperiments: 0,
      })
      .returning();

    const experiments = await Promise.all(
      combinations.map(async ({ chunkSize, embeddingModel, retrieverType }) => {
        const modelShort = embeddingModel.split("-").slice(-1)[0];
        const expName = `${name} [${modelShort}|${retrieverType}|${chunkSize}]`;
        const [exp] = await db
          .insert(experimentsTable)
          .values({
            name: expName,
            chunkSize,
            chunkOverlap,
            embeddingModel,
            retrieverType,
            topK,
            documentId,
            questionSetId,
            sweepId: sweep.id,
          })
          .returning();
        return exp;
      })
    );

    if (autoRun !== false) {
      runSweepInBackground(sweep.id, experiments).catch(console.error);
    }

    res.status(201).json(sweep);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create sweep");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sweeps/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [sweep] = await db.select().from(sweepsTable).where(eq(sweepsTable.id, id));
    if (!sweep) {
      res.status(404).json({ error: "Sweep not found" });
      return;
    }

    const experiments = await db
      .select()
      .from(experimentsTable)
      .where(eq(experimentsTable.sweepId, id))
      .orderBy(experimentsTable.createdAt);

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

    res.json({ ...sweep, experiments: withStats });
  } catch (err) {
    req.log.error({ err }, "Failed to get sweep");
    res.status(500).json({ error: "Internal server error" });
  }
});

async function runSweepInBackground(
  sweepId: number,
  experiments: Array<typeof experimentsTable.$inferSelect>
) {
  let completed = 0;
  for (const exp of experiments) {
    const [run] = await db
      .insert(evalRunsTable)
      .values({ experimentId: exp.id, status: "running" })
      .returning();
    await simulateEvalRun(run.id, exp);
    completed++;
    await db
      .update(sweepsTable)
      .set({ completedExperiments: completed })
      .where(eq(sweepsTable.id, sweepId));
  }
  await db
    .update(sweepsTable)
    .set({ status: "completed", completedExperiments: completed })
    .where(eq(sweepsTable.id, sweepId));
}

export default router;
