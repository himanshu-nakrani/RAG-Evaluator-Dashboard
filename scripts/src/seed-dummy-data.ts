import { db } from "@workspace/db";
import {
  experimentsTable,
  evalRunsTable,
  evalResultsTable,
  presetsTable,
  questionsTable,
  documentsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const CONFIGS = [
  { label: "Dense-256", chunkSize: 256, chunkOverlap: 0, embeddingModel: "text-embedding-3-small", retrieverType: "dense", topK: 3 },
  { label: "Hybrid-512", chunkSize: 512, chunkOverlap: 50, embeddingModel: "text-embedding-3-small", retrieverType: "hybrid", topK: 5 },
  { label: "MMR-1024", chunkSize: 1024, chunkOverlap: 100, embeddingModel: "text-embedding-3-large", retrieverType: "mmr", topK: 10 },
  { label: "Sparse-128", chunkSize: 128, chunkOverlap: 0, embeddingModel: "text-embedding-ada-002", retrieverType: "sparse", topK: 3 },
  { label: "Large-Hybrid-512", chunkSize: 512, chunkOverlap: 50, embeddingModel: "text-embedding-3-large", retrieverType: "hybrid", topK: 7 },
];

async function simulateEvalRun(runId: number, exp: any) {
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.questionSetId, exp.questionSetId));

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, exp.documentId));

  if (!questions.length) {
    await db
      .update(evalRunsTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(evalRunsTable.id, runId));
    return;
  }

  const chunkSizeFactor = Math.min(1, exp.chunkSize / 1024);
  const topKFactor = Math.min(1, exp.topK / 10);

  const embeddingQuality: Record<string, number> = {
    "text-embedding-ada-002": 0.85,
    "text-embedding-3-small": 0.88,
    "text-embedding-3-large": 0.92,
    "all-MiniLM-L6-v2": 0.78,
    "bge-small-en": 0.80,
  };
  const retrieverQuality: Record<string, number> = {
    dense: 0.86,
    sparse: 0.78,
    hybrid: 0.91,
    mmr: 0.84,
  };
  const embeddingScore = embeddingQuality[exp.embeddingModel] ?? 0.80;
  const retrieverScore = retrieverQuality[exp.retrieverType] ?? 0.82;

  let totalFaith = 0, totalRecall = 0, totalLatency = 0;

  for (const q of questions) {
    const latencyMs = 80 + chunkSizeFactor * 200 + exp.topK * 15 + (Math.random() * 80 - 40);
    const faithfulness = Math.min(1, Math.max(0,
      embeddingScore * 0.5 + retrieverScore * 0.3 + (exp.chunkOverlap / exp.chunkSize) * 0.1 + (Math.random() * 0.2 - 0.1)
    ));
    const contextRecall = Math.min(1, Math.max(0,
      chunkSizeFactor * 0.3 + topKFactor * 0.4 + retrieverScore * 0.2 + (Math.random() * 0.2 - 0.1)
    ));
    const content = doc?.content ?? "";
    const chunkStart = Math.floor(Math.random() * Math.max(1, content.length - exp.chunkSize));
    const retrievedContext = content.slice(chunkStart, chunkStart + exp.chunkSize);
    const generatedAnswer = `Based on the retrieved context, ${q.text.toLowerCase().startsWith("what") ? "the answer is" : "it appears that"} the relevant information has been retrieved.`;

    await db.insert(evalResultsTable).values({
      evalRunId: runId,
      questionId: q.id,
      questionText: q.text,
      retrievedContext: retrievedContext || "No content",
      generatedAnswer,
      faithfulness: Math.round(faithfulness * 1000) / 1000,
      contextRecall: Math.round(contextRecall * 1000) / 1000,
      latencyMs: Math.round(latencyMs * 10) / 10,
    });

    totalFaith += faithfulness;
    totalRecall += contextRecall;
    totalLatency += latencyMs;
    await new Promise((r) => setTimeout(r, 30));
  }

  const n = questions.length;
  await db
    .update(evalRunsTable)
    .set({
      status: "completed",
      avgFaithfulness: Math.round((totalFaith / n) * 1000) / 1000,
      avgContextRecall: Math.round((totalRecall / n) * 1000) / 1000,
      avgLatencyMs: Math.round((totalLatency / n) * 10) / 10,
      totalQuestions: n,
      completedAt: new Date(),
    })
    .where(eq(evalRunsTable.id, runId));
}

async function seed() {
  const presets = await db.select().from(presetsTable);

  console.log("Creating experiments and eval runs for all presets...\n");

  for (const preset of presets) {
    for (const cfg of CONFIGS.slice(0, 3)) {
      const name = `${preset.name} — ${cfg.label}`;
      const existing = await db
        .select()
        .from(experimentsTable)
        .where(eq(experimentsTable.name, name));

      if (existing.length > 0) {
        console.log(`  skip: "${name}" (exists)`);
        continue;
      }

      const [exp] = await db
        .insert(experimentsTable)
        .values({
          name,
          chunkSize: cfg.chunkSize,
          chunkOverlap: cfg.chunkOverlap,
          embeddingModel: cfg.embeddingModel,
          retrieverType: cfg.retrieverType,
          topK: cfg.topK,
          documentId: preset.documentId,
          questionSetId: preset.questionSetId,
        })
        .returning();

      // Create 2 eval runs per experiment for trend data
      for (let r = 0; r < 2; r++) {
        const [run] = await db
          .insert(evalRunsTable)
          .values({ experimentId: exp.id, status: "running" })
          .returning();

        await simulateEvalRun(run.id, exp);
      }
      console.log(`  done: "${name}" (2 runs)`);
    }
  }

  console.log(`\nSeeded ${presets.length * 3} experiments with eval runs.`);
  process.exit(0);
}

seed();
