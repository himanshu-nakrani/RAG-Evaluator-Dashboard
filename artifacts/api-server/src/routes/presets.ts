import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { presetsTable, experimentsTable, evalRunsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { simulateEvalRun } from "./eval-runs";
import { z } from "zod";

const router: IRouter = Router();

const UsePresetBodySchema = z.object({
  name: z.string().optional(),
});

router.get("/presets", async (req, res) => {
  try {
    const presets = await db.select().from(presetsTable).orderBy(presetsTable.createdAt);
    res.json(presets);
  } catch (err) {
    req.log.error({ err }, "Failed to list presets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/presets/:slug", async (req, res) => {
  try {
    const [preset] = await db
      .select()
      .from(presetsTable)
      .where(eq(presetsTable.slug, req.params.slug));
    if (!preset) {
      res.status(404).json({ error: "Preset not found" });
      return;
    }
    res.json(preset);
  } catch (err) {
    req.log.error({ err }, "Failed to get preset");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/presets/:id/use", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UsePresetBodySchema.parse(req.body ?? {});

    const [preset] = await db
      .select()
      .from(presetsTable)
      .where(eq(presetsTable.id, id));

    if (!preset) {
      res.status(404).json({ error: "Preset not found" });
      return;
    }

    const [exp] = await db
      .insert(experimentsTable)
      .values({
        name: body.name ?? preset.name,
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

    simulateEvalRun(run.id, exp).catch((err) =>
      console.error("Preset eval run failed:", err),
    );

    res.status(201).json({ experimentId: exp.id, evalRunId: run.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to use preset");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
