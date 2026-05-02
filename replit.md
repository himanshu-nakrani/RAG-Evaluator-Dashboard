# Workspace

## Overview

RAG Evaluation Dashboard — a developer tool for ML engineers to test retrieval pipelines. Upload documents, create question sets, configure experiments (chunk size, embedding model, retriever type), run evaluations, and visualize faithfulness, context recall, and latency metrics.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS v4 + Recharts + Framer Motion

## Artifacts

- **rag-eval** (`/`) — RAG Eval Dashboard frontend (React + Vite)
- **api-server** (`/api`) — Express API backend

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Schema

- `documents` — uploaded text documents (name, content, size_bytes)
- `question_sets` — grouped sets of evaluation questions
- `questions` — individual QA pairs with optional ground truth
- `experiments` — RAG config (chunk_size, chunk_overlap, embedding_model, retriever_type, top_k)
- `eval_runs` — evaluation run results (avg_faithfulness, avg_context_recall, avg_latency_ms)
- `eval_results` — per-question results with retrieved context and generated answers

## Notes

- Evaluation is simulated server-side with realistic metrics based on config parameters
- `lib/api-zod/src/index.ts` is patched post-codegen (only exports from `./generated/api` to avoid duplicate exports with types folder)
- Orval config in `lib/api-spec/orval.config.ts` does not generate a separate types schemas folder for the zod output

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
