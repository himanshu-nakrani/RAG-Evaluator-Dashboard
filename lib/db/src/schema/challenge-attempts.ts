import { pgTable, serial, text, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { presetsTable } from "./presets";
import { experimentsTable } from "./experiments";
import { evalRunsTable } from "./experiments";

export const challengeAttemptsTable = pgTable("challenge_attempts", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  presetId: integer("preset_id")
    .references(() => presetsTable.id, { onDelete: "cascade" })
    .notNull(),
  experimentId: integer("experiment_id")
    .references(() => experimentsTable.id, { onDelete: "cascade" })
    .notNull(),
  evalRunId: integer("eval_run_id")
    .references(() => evalRunsTable.id, { onDelete: "cascade" })
    .notNull(),
  score: integer("score"),
  challengeDate: varchar("challenge_date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
