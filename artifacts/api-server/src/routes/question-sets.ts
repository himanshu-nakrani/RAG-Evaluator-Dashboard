import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { questionSetsTable, questionsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { CreateQuestionSetBody, AddQuestionBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/question-sets", async (req, res) => {
  try {
    const sets = await db.select().from(questionSetsTable).orderBy(questionSetsTable.createdAt);
    const withCounts = await Promise.all(
      sets.map(async (s) => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(questionsTable)
          .where(eq(questionsTable.questionSetId, s.id));
        return { ...s, questionCount: Number(value) };
      })
    );
    res.json(withCounts);
  } catch (err) {
    req.log.error({ err }, "Failed to list question sets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/question-sets", async (req, res) => {
  try {
    const body = CreateQuestionSetBody.parse(req.body);
    const [set] = await db.insert(questionSetsTable).values(body).returning();
    res.status(201).json({ ...set, questionCount: 0 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to create question set");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/question-sets/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [set] = await db.select().from(questionSetsTable).where(eq(questionSetsTable.id, id));
    if (!set) {
      res.status(404).json({ error: "Question set not found" });
      return;
    }
    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.questionSetId, id))
      .orderBy(questionsTable.createdAt);
    res.json({ ...set, questions });
  } catch (err) {
    req.log.error({ err }, "Failed to get question set");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/question-sets/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(questionSetsTable).where(eq(questionSetsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete question set");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/question-sets/:id/questions", async (req, res) => {
  try {
    const questionSetId = Number(req.params.id);
    const body = AddQuestionBody.parse(req.body);
    const [question] = await db
      .insert(questionsTable)
      .values({ questionSetId, text: body.text, groundTruth: body.groundTruth ?? null })
      .returning();
    res.status(201).json(question);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.issues });
      return;
    }
    req.log.error({ err }, "Failed to add question");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/question-sets/:id/import", async (req, res) => {
  try {
    const questionSetId = Number(req.params.id);
    const [set] = await db.select().from(questionSetsTable).where(eq(questionSetsTable.id, questionSetId));
    if (!set) {
      res.status(404).json({ error: "Question set not found" });
      return;
    }

    const { csvText } = req.body as { csvText: string };
    if (!csvText || typeof csvText !== "string") {
      res.status(400).json({ error: "csvText is required" });
      return;
    }

    const lines = csvText.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      res.json({ imported: 0, skipped: 0, errors: ["CSV must have a header row and at least one data row"], questions: [] });
      return;
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const textIdx = header.findIndex((h) => ["text", "question"].includes(h));
    const gtIdx = header.findIndex((h) => ["ground_truth", "answer", "groundtruth"].includes(h));

    if (textIdx === -1) {
      res.status(400).json({ error: 'CSV must have a "text" or "question" column' });
      return;
    }

    const errors: string[] = [];
    let skipped = 0;
    const toInsert: Array<{ questionSetId: number; text: string; groundTruth: string | null }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const text = cols[textIdx]?.trim().replace(/^["']|["']$/g, "");
      if (!text) { skipped++; continue; }
      const groundTruth = gtIdx >= 0 ? (cols[gtIdx]?.trim().replace(/^["']|["']$/g, "") || null) : null;
      toInsert.push({ questionSetId, text, groundTruth });
    }

    let questions: typeof questionsTable.$inferSelect[] = [];
    if (toInsert.length > 0) {
      questions = await db.insert(questionsTable).values(toInsert).returning();
    }

    res.json({ imported: questions.length, skipped, errors, questions });
  } catch (err) {
    req.log.error({ err }, "Failed to import questions");
    res.status(500).json({ error: "Internal server error" });
  }
});

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export default router;
