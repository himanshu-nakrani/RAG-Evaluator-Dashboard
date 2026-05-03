import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { templatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const CreateTemplateBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  chunkSizes: z.array(z.number()).min(1),
  embeddingModels: z.array(z.string()).min(1),
  retrieverTypes: z.array(z.string()).min(1),
  topK: z.number().int().min(1),
  chunkOverlap: z.number().int().min(0).optional(),
  category: z.string().optional(),
});

async function seedPresets() {
  try {
    const existing = await db
      .select()
      .from(templatesTable)
      .where(eq(templatesTable.isPreset, true));

    if (existing.length === 0) {
      const presets = [
        {
          name: "Balanced",
          description: "Good balance between accuracy and speed",
          chunkSizes: [256, 512],
          embeddingModels: ["text-embedding-3-small", "text-embedding-3-large"],
          retrieverTypes: ["similarity", "hybrid"],
          topK: 5,
          chunkOverlap: 50,
          isPreset: true,
          category: "General",
        },
        {
          name: "Precision Focused",
          description: "Prioritize accuracy over speed, use larger chunks and more context",
          chunkSizes: [512, 1024],
          embeddingModels: ["text-embedding-3-large"],
          retrieverTypes: ["mmr", "hybrid"],
          topK: 10,
          chunkOverlap: 100,
          isPreset: true,
          category: "High Accuracy",
        },
        {
          name: "Speed Optimized",
          description: "Fast inference with smaller chunks and minimal retrieval",
          chunkSizes: [128, 256],
          embeddingModels: ["text-embedding-3-small"],
          retrieverTypes: ["similarity"],
          topK: 3,
          chunkOverlap: 0,
          isPreset: true,
          category: "Performance",
        },
        {
          name: "Comprehensive Sweep",
          description: "Exhaustive search across all common parameter combinations",
          chunkSizes: [128, 256, 512, 1024],
          embeddingModels: ["text-embedding-3-small", "text-embedding-3-large"],
          retrieverTypes: ["similarity", "mmr", "hybrid"],
          topK: 5,
          chunkOverlap: 50,
          isPreset: true,
          category: "Research",
        },
      ];

      await db.insert(templatesTable).values(presets);
    }
  } catch {
    // Table may not exist yet during migrations
  }
}

seedPresets();

router.get("/templates", async (req, res) => {
  try {
    const templates = await db.select().from(templatesTable).orderBy(templatesTable.createdAt);
    res.json(templates);
  } catch (err) {
    req.log.error({ err }, "Failed to list templates");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const body = CreateTemplateBodySchema.parse(req.body);
    const [template] = await db
      .insert(templatesTable)
      .values({
        name: body.name,
        description: body.description,
        chunkSizes: body.chunkSizes,
        embeddingModels: body.embeddingModels,
        retrieverTypes: body.retrieverTypes,
        topK: body.topK,
        chunkOverlap: body.chunkOverlap ?? 50,
        isPreset: false,
        category: body.category,
      })
      .returning();

    res.status(201).json(template);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create template");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/templates/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db
      .delete(templatesTable)
      .where(eq(templatesTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete template");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
