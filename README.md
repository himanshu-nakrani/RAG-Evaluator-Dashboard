# RAG Evaluator Dashboard

A pnpm monorepo for building and analyzing retrieval-augmented generation (RAG) evaluation workflows.

It combines a React dashboard, shared API contracts, generated typed clients, and database schema modules for managing documents, question sets, experiments, sweeps, templates, and evaluation results.

## What it does

RAG Evaluator Dashboard helps ML and AI teams:

- upload and manage source documents
- define reusable question sets and ground-truth answers
- configure RAG experiments with retrieval and chunking parameters
- launch evaluation runs and parameter sweeps
- compare experiment outcomes across quality and latency metrics
- annotate experiments and monitor regressions

Tracked entities and outputs in the current codebase include:

- documents
- question sets and questions
- experiments
- evaluation runs and per-question results
- sweeps
- templates
- experiment annotations

Current evaluation metrics surfaced in the schema include:

- faithfulness
- context recall
- latency

## Monorepo structure

This repository is organized as a pnpm workspace.

```text
.
├── artifacts/
│   ├── rag-eval/           # Primary React/Vite dashboard app
│   └── mockup-sandbox/     # UI sandbox and prototyping app
├── lib/
│   ├── api-client-react/   # Generated React API client/hooks
│   ├── api-spec/           # OpenAPI source and Orval config
│   ├── api-zod/            # Generated/shared Zod schemas
│   └── db/                 # Drizzle schema and DB-layer modules
├── scripts/                # Utility scripts
└── README.md
```

## Tech stack

Frontend
- React 19
- Vite 7
- Tailwind CSS 4
- TanStack Query
- Recharts
- Framer Motion
- Radix UI

Data and contracts
- PostgreSQL
- Drizzle ORM
- OpenAPI
- Orval code generation
- Zod

Tooling
- TypeScript
- pnpm workspaces

## Workspace packages

### apps and artifacts

- `artifacts/rag-eval`
  - Main dashboard application with pages for dashboard, documents, question sets, experiments, sweeps, leaderboard, templates, comparison views, trends, and evaluation run details.
- `artifacts/mockup-sandbox`
  - Separate sandbox for iterating on UI concepts and mockups.

### shared libraries

- `lib/db`
  - Database schema modules for documents, question sets, experiments, sweeps, templates, and related evaluation records.
- `lib/api-spec`
  - Source OpenAPI definition and Orval configuration used for code generation.
- `lib/api-client-react`
  - Typed React client utilities generated from the API contract.
- `lib/api-zod`
  - Shared/generated Zod schemas derived from the API contract.

## Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL

## Getting started

Install dependencies:

```bash
pnpm install
```

Typecheck the workspace:

```bash
pnpm typecheck
```

Build the workspace:

```bash
pnpm build
```

Run the main dashboard app:

```bash
pnpm --filter ./artifacts/rag-eval dev
```

## API and schema workflow

OpenAPI source lives at:

- `lib/api-spec/openapi.yaml`

Generated outputs live at:

- `lib/api-client-react/src/generated`
- `lib/api-zod/src/generated`

Regenerate API artifacts with the package script in `lib/api-spec`:

```bash
pnpm --filter @workspace/api-spec codegen
```

## Data model highlights

The current schema includes support for:

- documents with stored content and size metadata
- question sets containing individual questions and optional ground truth answers
- experiments with chunk size, chunk overlap, embedding model, retriever type, top-k, and linked document/question set references
- evaluation runs with status, aggregate metrics, and completion timestamps
- per-question evaluation results with retrieved context, generated answer, and metric values
- sweeps for grouped experiment execution tracking
- templates for reusable parameter combinations
- experiment annotations for tags, notes, and regression tracking

## License

MIT
