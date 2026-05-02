import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";

export const questionSetsTable = pgTable("question_sets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  questionSetId: integer("question_set_id").references(() => questionSetsTable.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  groundTruth: text("ground_truth"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuestionSetSchema = createInsertSchema(questionSetsTable).omit({ id: true, createdAt: true });
export type InsertQuestionSet = z.infer<typeof insertQuestionSetSchema>;
export type QuestionSet = typeof questionSetsTable.$inferSelect;

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;

// Suppress unused import warning
void documentsTable;
