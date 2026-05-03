import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { templatesTable } from "@workspace/db";
import { z } from "zod";
import { CreateTemplateBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Seed preset templates on startup
async function seedPresets() {
  const existing = await db
    .select()
    .from(templatesTable)
    .where(db.expression(sql`${templatesTable.isPreset} = true`));

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
        description: "Prioritize accuracy over speed",
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
        description: "Fast inference with decent accuracy",
        chunkSizes: [128, 256],
        embeddingModels: ["text-embedding-3-small"],
        retrieverTypes: ["similarity"],
        topK: 3,
        chunkOverlap: 0,
        isPreset: true,
        category: "Performance",
      },
    ];

    await db.insert(templatesTable).values(presets);
  }
}

seedPresets().catch(console.error);

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
    const body = CreateTemplateBody.parse(req.body);
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

export default router;
