# RAG Evaluation Dashboard

A developer tool for ML engineers to test and evaluate retrieval-augmented generation (RAG) pipelines.

## Features

- **Document Upload** — Upload text documents for evaluation
- **Question Set Management** — Create and manage grouped evaluation question sets with QA pairs
- **Experiment Configuration** — Configure RAG experiments with customizable parameters
- **Evaluation Execution** — Run evaluations and visualize results
- **Metrics Dashboard** — Track faithfulness, context recall, and latency metrics

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS v4 + Recharts + Framer Motion
- **Backend**: Express 5 + PostgreSQL + Drizzle ORM
- **API**: OpenAPI spec + Orval codegen
- **Validation**: Zod schemas

## Project Structure

```
├── packages/
│   ├── rag-eval/          # React frontend
│   ├── api-server/        # Express backend API
│   ├── db/                # PostgreSQL + Drizzle ORM
│   ├── api-spec/          # OpenAPI spec + Orval codegen
│   ├── api-client-react/  # React Query hooks
│   └── api-zod/           # Zod validation schemas
├── scripts/               # Utility scripts
├── lib/                   # Shared libraries
└── artifacts/             # Evaluation artifacts
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL

### Installation

```bash
pnpm install
```

### Development

Start the development server:

```bash
pnpm dev
```

### Database Setup

Run migrations:

```bash
pnpm db:migrate
```

## Configuration

Configure RAG experiments with parameters like:
- Chunk size and overlap
- Embedding model selection
- Retriever type
- Top-k retrieval count

## License

MIT