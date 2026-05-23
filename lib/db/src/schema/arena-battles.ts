import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { documentsTable } from "./documents";
import { questionSetsTable } from "./question-sets";
import { experimentsTable } from "./experiments";
import { evalRunsTable } from "./experiments";

export const arenaBattlesTable = pgTable("arena_battles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sessionId: text("session_id").notNull(),
  documentId: integer("document_id")
    .references(() => documentsTable.id, { onDelete: "cascade" })
    .notNull(),
  questionSetId: integer("question_set_id")
    .references(() => questionSetsTable.id, { onDelete: "cascade" })
    .notNull(),
  experimentAId: integer("experiment_a_id")
    .references(() => experimentsTable.id, { onDelete: "cascade" })
    .notNull(),
  experimentBId: integer("experiment_b_id")
    .references(() => experimentsTable.id, { onDelete: "cascade" })
    .notNull(),
  evalRunAId: integer("eval_run_a_id")
    .references(() => evalRunsTable.id, { onDelete: "set null" }),
  evalRunBId: integer("eval_run_b_id")
    .references(() => evalRunsTable.id, { onDelete: "set null" }),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] })
    .notNull()
    .default("pending"),
  metricWinner: text("metric_winner", { enum: ["A", "B", "tie"] }),
  humanWinner: text("human_winner", { enum: ["A", "B", "tie"] }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
