import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";
import { questionSetsTable } from "./question-sets";

export const experimentsTable = pgTable("experiments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  chunkSize: integer("chunk_size").notNull(),
  chunkOverlap: integer("chunk_overlap").notNull().default(0),
  embeddingModel: text("embedding_model").notNull(),
  retrieverType: text("retriever_type").notNull(),
  topK: integer("top_k").notNull().default(5),
  documentId: integer("document_id").references(() => documentsTable.id, { onDelete: "cascade" }).notNull(),
  questionSetId: integer("question_set_id").references(() => questionSetsTable.id, { onDelete: "cascade" }).notNull(),
  sweepId: integer("sweep_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const evalRunsTable = pgTable("eval_runs", {
  id: serial("id").primaryKey(),
  experimentId: integer("experiment_id").references(() => experimentsTable.id, { onDelete: "cascade" }).notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).notNull().default("pending"),
  avgFaithfulness: real("avg_faithfulness"),
  avgContextRecall: real("avg_context_recall"),
  avgLatencyMs: real("avg_latency_ms"),
  totalQuestions: integer("total_questions"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const evalResultsTable = pgTable("eval_results", {
  id: serial("id").primaryKey(),
  evalRunId: integer("eval_run_id").references(() => evalRunsTable.id, { onDelete: "cascade" }).notNull(),
  questionId: integer("question_id").notNull(),
  questionText: text("question_text").notNull(),
  retrievedContext: text("retrieved_context"),
  generatedAnswer: text("generated_answer"),
  faithfulness: real("faithfulness"),
  contextRecall: real("context_recall"),
  latencyMs: real("latency_ms"),
});

export const insertExperimentSchema = createInsertSchema(experimentsTable).omit({ id: true, createdAt: true });
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experimentsTable.$inferSelect;

export const insertEvalRunSchema = createInsertSchema(evalRunsTable).omit({ id: true, createdAt: true, completedAt: true });
export type InsertEvalRun = z.infer<typeof insertEvalRunSchema>;
export type EvalRun = typeof evalRunsTable.$inferSelect;

export type EvalResult = typeof evalResultsTable.$inferSelect;
