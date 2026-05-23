import { pgTable, serial, integer, text, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { evalRunsTable } from "./experiments";
import { arenaBattlesTable } from "./arena-battles";

export const humanRatingsTable = pgTable(
  "human_ratings",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    evalRunId: integer("eval_run_id")
      .references(() => evalRunsTable.id, { onDelete: "cascade" })
      .notNull(),
    questionId: integer("question_id").notNull(),
    rating: integer("rating").notNull(),
    preference: text("preference", { enum: ["A", "B", "tie"] }),
    arenaBattleId: integer("arena_battle_id").references(() => arenaBattlesTable.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sessionRunQuestionUq: uniqueIndex("human_ratings_session_run_question_uq").on(
      table.sessionId,
      table.evalRunId,
      table.questionId,
    ),
  }),
);

export const insertHumanRatingSchema = createInsertSchema(humanRatingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertHumanRating = z.infer<typeof insertHumanRatingSchema>;
export type HumanRating = typeof humanRatingsTable.$inferSelect;
