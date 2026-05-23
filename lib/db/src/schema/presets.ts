import { pgTable, serial, text, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { documentsTable } from "./documents";
import { questionSetsTable } from "./question-sets";

export const presetsTable = pgTable("presets", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 32 }).notNull(),
  documentId: integer("document_id")
    .references(() => documentsTable.id, { onDelete: "cascade" })
    .notNull(),
  questionSetId: integer("question_set_id")
    .references(() => questionSetsTable.id, { onDelete: "cascade" })
    .notNull(),
  defaultChunkSize: integer("default_chunk_size").notNull().default(512),
  defaultChunkOverlap: integer("default_chunk_overlap").notNull().default(50),
  defaultEmbeddingModel: text("default_embedding_model").notNull().default("text-embedding-3-small"),
  defaultRetrieverType: text("default_retriever_type").notNull().default("hybrid"),
  defaultTopK: integer("default_top_k").notNull().default(5),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
