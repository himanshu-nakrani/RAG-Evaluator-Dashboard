import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { CreateDocumentBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/documents", async (req, res) => {
  try {
    const docs = await db.select().from(documentsTable).orderBy(documentsTable.createdAt);
    res.json(docs);
  } catch (err) {
    req.log.error({ err }, "Failed to list documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/documents", async (req, res) => {
  try {
    const body = CreateDocumentBody.parse(req.body);
    const [doc] = await db
      .insert(documentsTable)
      .values({
        name: body.name,
        content: body.content,
        sizeBytes: Buffer.byteLength(body.content, "utf8"),
      })
      .returning();
    res.status(201).json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/documents/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to get document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(documentsTable).where(eq(documentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
