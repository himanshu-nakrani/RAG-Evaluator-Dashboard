import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { documentsTable } from "./documents";
import { questionSetsTable } from "./question-sets";

export const sweepsTable = pgTable("sweeps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  documentId: integer("document_id")
    .references(() => documentsTable.id, { onDelete: "cascade" })
    .notNull(),
  questionSetId: integer("question_set_id")
    .references(() => questionSetsTable.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status", { enum: ["pending", "running", "completed"] })
    .notNull()
    .default("pending"),
  totalExperiments: integer("total_experiments").notNull().default(0),
  completedExperiments: integer("completed_experiments").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
