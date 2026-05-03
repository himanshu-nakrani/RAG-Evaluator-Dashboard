import { pgTable, serial, text, integer, json, boolean, timestamp } from "drizzle-orm/pg-core";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  chunkSizes: json("chunk_sizes").notNull().$type<number[]>(),
  embeddingModels: json("embedding_models").notNull().$type<string[]>(),
  retrieverTypes: json("retriever_types").notNull().$type<string[]>(),
  topK: integer("top_k").notNull(),
  chunkOverlap: integer("chunk_overlap").notNull().default(0),
  isPreset: boolean("is_preset").notNull().default(false),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const experimentAnnotationsTable = pgTable("experiment_annotations", {
  id: serial("id").primaryKey(),
  experimentId: integer("experiment_id").notNull(),
  tags: json("tags").notNull().$type<string[]>().default([]),
  notes: text("notes"),
  regressionDetected: boolean("regression_detected").default(false),
  regressionSeverity: text("regression_severity"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
