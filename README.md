# RAG Evaluator Dashboard

A pnpm monorepo for building, running, and analyzing retrieval-augmented generation (RAG) evaluation workflows — with **blind evaluation**, **daily challenges**, and **arena battles**.

```text
┌──────────────────────────────────────────────────────────────────┐
│  RAG Evaluator Dashboard                                         │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ 📄 Docs  │  │ ❓ Qs   │  │ ⚙️ Exps  │  │ 📊 Dashboard  │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ 👁 Blind │  │ 🎯 Presets│  │ 🏆 Arena │  │ 🔥 Challenge  │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Features

### Core
| Feature | Description |
|---|---|
| **Documents** | Upload and manage source documents for RAG evaluation |
| **Question Sets** | Define reusable question sets with ground-truth answers |
| **Experiments** | Configure RAG parameters (chunk size, embedding model, retriever type, top-K) |
| **Eval Runs** | Execute evaluation runs with synthetic or real RAG metrics |
| **Sweeps** | Parameter sweep generation — run multiple configs at once |
| **Leaderboard** | Rank experiments by faithfulness, recall, and latency |
| **Trends** | Per-experiment metric trends with regression detection |
| **Templates** | Save and reuse parameter combinations (preset + custom) |

### Engagement (new)
| Feature | Description |
|---|---|
| **Blind Mode** 👁 | Hide system identities during comparison — rate answers without bias, then reveal |
| **Preset Scenarios** 🎯 | Curated document + question bundles. One click to launch an evaluation |
| **Daily Challenge** 🔥 | Deterministic daily preset. Score your run, beat your best |
| **RAG Arena** 🏆 | Pit two RAG configs head-to-head. Blind side-by-side. Human + metric verdict |

---

## Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend — React 19 + Vite 7"]
        direction TB
        Pages["Pages<br/>dashboard · experiments · compare<br/>presets · challenge · arena"]
        UI["UI Layer<br/>Radix UI · Tailwind CSS 4<br/>Framer Motion · Recharts"]
        Query["Data Layer<br/>TanStack Query<br/>generated hooks"]
        Session["Session<br/>X-Session-Id<br/>localStorage UUID"]
    end

    subgraph API["API Server — Express 5"]
        direction TB
        Routes["Routes<br/>/experiments · /eval-runs<br/>/human-ratings · /arena …"]
        Sim["Simulation Engine<br/>simulateEvalRun()<br/>deterministic metrics"]
    end

    subgraph Contracts["API Contracts"]
        Spec["OpenAPI 3.1<br/>openapi.yaml<br/>33 endpoints · 44 schemas"]
        Gen["Code Generation<br/>Orval<br/>→ React hooks<br/>→ Zod schemas"]
    end

    subgraph Data["Database — PostgreSQL"]
        direction LR
        Core["Core<br/>documents<br/>question_sets · questions<br/>experiments · eval_runs<br/>eval_results · sweeps<br/>templates · annotations"]
        New["Engagement<br/>human_ratings<br/>presets<br/>challenge_attempts<br/>arena_battles"]
    end

    Frontend -->|"X-Session-Id header"| API
    API --> Data
    Spec --> Gen
    Gen -->|"@workspace/api-client-react"| Frontend
    Gen -->|"@workspace/api-zod"| API
```

## Data model

```mermaid
erDiagram
    documents ||--o{ experiments : "document_id"
    question_sets ||--o{ questions : "question_set_id"
    question_sets ||--o{ experiments : "question_set_id"
    experiments ||--o{ eval_runs : "experiment_id"
    eval_runs ||--o{ eval_results : "eval_run_id"
    eval_runs ||--o{ human_ratings : "eval_run_id"
    experiments ||--o{ challenge_attempts : "experiment_id"

    presets {
        serial id PK
        varchar slug UK
        text name
        text description
        varchar category
        int document_id FK
        int question_set_id FK
        int default_chunk_size
        int default_chunk_overlap
        text default_embedding_model
        text default_retriever_type
        int default_top_k
    }

    arena_battles {
        serial id PK
        text name
        text session_id
        int document_id FK
        int question_set_id FK
        int experiment_a_id FK
        int experiment_b_id FK
        int eval_run_a_id FK
        int eval_run_b_id FK
        text status
        text metric_winner
        text human_winner
    }

    human_ratings {
        serial id PK
        varchar session_id
        int eval_run_id FK
        int question_id
        int rating
        text preference
        int arena_battle_id FK
    }

    challenge_attempts {
        serial id PK
        varchar session_id
        int preset_id FK
        int experiment_id FK
        int eval_run_id FK
        int score
        varchar challenge_date
    }
```

## Request flow

```mermaid
sequenceDiagram
    participant Browser
    participant Vite as Vite Dev Server
    participant Express as Express API
    participant DB as PostgreSQL

    Browser->>Vite: GET /experiments/compare?id1=1&id2=2&blind=1
    Vite->>Browser: React app (SPA)
    Browser->>Express: GET /api/experiments/compare?id1=1&id2=2
    Note over Browser,Express: X-Session-Id: <uuid>
    Express->>DB: SELECT experiments, eval_runs...
    DB-->>Express: experiment data + metrics
    Express-->>Browser: { exp1, exp2, diff }
    Note over Browser: Names hidden, "System A" / "System B" shown

    Browser->>Express: POST /api/human-ratings
    Note over Browser,Express: { evalRunId, questionId, rating: 4 }
    Express->>DB: UPSERT human_ratings
    DB-->>Express: ok
    Express-->>Browser: 201

    Browser->>Browser: User clicks Reveal
    Note over Browser: Names + configs + charts shown
```

## Monorepo structure

```text
.
├── artifacts/
│   ├── api-server/              # Express 5 backend
│   │   └── src/
│   │       ├── routes/          # 15 route modules
│   │       │   ├── experiments.ts    # CRUD + compare + blind toggle
│   │       │   ├── eval-runs.ts      # Trigger + simulate + blind endpoint
│   │       │   ├── human-ratings.ts  # Session-scoped star ratings
│   │       │   ├── presets.ts        # Curated scenarios + one-click use
│   │       │   ├── challenge.ts      # Daily challenge + polling scorer
│   │       │   ├── arena.ts          # Head-to-head battles + finalize
│   │       │   ├── comparison.ts     # Two-experiment diff
│   │       │   ├── trends.ts         # Metric time-series + regressions
│   │       │   ├── templates.ts      # Reusable config templates
│   │       │   ├── sweeps.ts         # Parameter sweep generation
│   │       │   ├── dashboard.ts      # Aggregate metrics summary
│   │       │   ├── leaderboard.ts    # Cross-experiment rankings
│   │       │   ├── documents.ts      # Document CRUD
│   │       │   ├── question-sets.ts  # Question set CRUD + import
│   │       │   └── health.ts
│   │       ├── app.ts           # Express app + /api prefix
│   │       └── index.ts         # Entry point (PORT, start)
│   ├── rag-eval/                # React 19 + Vite 7 dashboard
│   │   └── src/
│   │       ├── pages/           # 17 page components
│   │       │   ├── dashboard.tsx
│   │       │   ├── experiments.tsx
│   │       │   ├── experiment-detail.tsx
│   │       │   ├── experiment-comparison.tsx  # Blind mode toggle
│   │       │   ├── experiment-trends.tsx
│   │       │   ├── eval-run-detail.tsx        # Challenge score banner
│   │       │   ├── presets.tsx                # Preset cards + Use button
│   │       │   ├── challenge.tsx              # Daily challenge + history
│   │       │   ├── arena.tsx                  # Battle list + New dialog
│   │       │   ├── arena-detail.tsx           # Blind side-by-side view
│   │       │   ├── templates-library.tsx
│   │       │   ├── leaderboard.tsx
│   │       │   ├── sweeps.tsx
│   │       │   ├── sweep-detail.tsx
│   │       │   ├── documents.tsx
│   │       │   ├── question-sets.tsx
│   │       │   └── question-set-detail.tsx
│   │       ├── components/
│   │       │   ├── ui/          # Radix + Tailwind (shadcn-style)
│   │       │   ├── layout/      # App shell + sidebar nav
│   │       │   └── blind/       # HumanRatingPanel (star ratings)
│   │       └── lib/
│   │           ├── session-id.ts  # localStorage UUID
│   │           └── utils.ts
│   └── mockup-sandbox/          # UI prototyping sandbox
├── lib/
│   ├── api-spec/                # OpenAPI 3.1 source
│   │   ├── openapi.yaml         # 33 endpoints · 44 schemas
│   │   └── orval.config.mjs     # Codegen config (React + Zod)
│   ├── api-client-react/        # Generated TanStack Query hooks
│   │   └── src/
│   │       ├── generated/       # api.ts + api.schemas.ts (auto)
│   │       ├── custom-fetch.ts  # X-Session-Id header injection
│   │       └── index.ts
│   ├── api-zod/                 # Generated Zod schemas
│   │   └── src/
│   │       ├── generated/       # api.ts (auto)
│   │       └── index.ts
│   └── db/                      # Drizzle ORM schemas
│       └── src/
│           └── schema/
│               ├── documents.ts
│               ├── question-sets.ts
│               ├── experiments.ts    # + eval_runs + eval_results
│               ├── templates.ts      # + experiment_annotations
│               ├── sweeps.ts
│               ├── human-ratings.ts  # Anonymous star ratings
│               ├── presets.ts        # Curated scenarios
│               ├── challenge-attempts.ts
│               └── arena-battles.ts
└── scripts/                     # Seed scripts
    └── src/
        ├── seed-presets.ts      # 4 curated scenarios
        └── seed-dummy-data.ts   # 12 experiments + 24 eval runs
```

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · Vite 7 · Tailwind CSS 4 · TanStack Query · Recharts · Framer Motion · Radix UI |
| **Backend** | Express 5 · Pino · esbuild |
| **Database** | PostgreSQL · Drizzle ORM · drizzle-kit |
| **API Contracts** | OpenAPI 3.1 · Orval (React Query + Zod codegen) |
| **Tooling** | TypeScript · pnpm workspaces · Node.js 24+ |

## Feature deep-dives

### Blind Evaluation Mode

Toggles on the **Compare Experiments** page via `?blind=1`. When active:

- Experiment names are replaced with **"System A" / "System B"**
- Configuration details (chunk size, embedding, retriever) are **hidden**
- Radar charts, bar charts, winner banners, and metric diffs are **suppressed**
- Each system shows a **5-star rating panel** — ratings persist to `human_ratings` via `X-Session-Id`
- Click **Reveal** to drop blind mode and see the real identities

```mermaid
stateDiagram-v2
    [*] --> Normal: Page load
    Normal --> Blind: Toggle switch or ?blind=1
    Blind --> Normal: Click Reveal
    Blind --> Blind: Rate System A (1-5)
    Blind --> Blind: Rate System B (1-5)
```

### Preset Scenarios + Challenge

**Presets** are pre-seeded document + question set bundles. Each comes with sensible RAG defaults.

| Preset | Category | Questions |
|---|---|---|
| Payments API Reference | `technical` | 4 |
| Service Terms of Use | `legal` | 4 |
| Password Reset Guide | `support` | 4 |
| Kingdom of Eldoria | `fantasy` | 5 |

**Daily Challenge** picks one preset deterministically (hash of `YYYY-MM-DD` mod preset count). Everyone gets the same preset each day. Score = `round((avgFaithfulness + avgContextRecall) / 2 × 100)`.

```mermaid
flowchart LR
    A[Visit /challenge] --> B{Already attempted<br/>today?}
    B -->|No| C[Start Challenge]
    B -->|Yes| D[View history]
    C --> E[Create experiment<br/>from preset defaults]
    E --> F[Trigger eval run]
    F --> G[Poll every 500ms<br/>until completed]
    G --> H[Store score in<br/>challenge_attempts]
    H --> I[Redirect to run detail<br/>with score banner]
```

### RAG Arena

Head-to-head blind battles between two RAG configurations.

```mermaid
flowchart TB
    A["New Battle dialog"] --> B["Pick document + question set"]
    B --> C["Configure System A<br/>(chunk, retriever, embedding, top-K)"]
    B --> D["Configure System B<br/>(chunk, retriever, embedding, top-K)"]
    C --> E["Create 2 experiments<br/>(both is_blind=true)"]
    D --> E
    E --> F["Create 2 eval runs<br/>Promise.all(simA, simB)"]
    F --> G["Both complete →<br/>compute metric winner"]
    G --> H["Battle detail page<br/>blind side-by-side"]
    H --> I["User rates each answer<br/>+ picks verdict (A/B/tie)"]
    I --> J["Reveal: names, configs, winners"]
```

## Getting started

### Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL (or a cloud PostgreSQL URL like Neon)

### Setup

```bash
# Clone and install
pnpm install

# Set your database URL
export DATABASE_URL="postgresql://..."

# Push schema to database
pnpm --filter @workspace/db push

# Seed presets (4 curated scenarios)
pnpm --filter @workspace/scripts seed:presets

# Seed dummy data (12 experiments + 24 eval runs)
pnpm --filter @workspace/scripts seed:dummy

# Typecheck the workspace
pnpm typecheck
```

### Development

Start both servers:

```bash
# Terminal 1 — API server
DATABASE_URL="postgresql://..." PORT=3001 \
  pnpm --filter @workspace/api-server dev

# Terminal 2 — Frontend (proxies /api → localhost:3001)
PORT=5173 BASE_PATH=/ \
  pnpm --filter @workspace/rag-eval dev
```

Open **http://localhost:5173** in your browser.

### API codegen

Edit `lib/api-spec/openapi.yaml`, then regenerate:

```bash
pnpm --filter @workspace/api-spec codegen
```

This produces:
- `lib/api-client-react/src/generated/api.ts` + `api.schemas.ts` — TanStack Query hooks
- `lib/api-zod/src/generated/api.ts` — Zod schemas
- Runs `tsc --build` to verify generated code compiles

## Evaluation metrics

| Metric | Description | Range |
|---|---|---|
| **Faithfulness** | How well the generated answer is grounded in retrieved context | 0.0–1.0 |
| **Context Recall** | How much of the ground truth is present in the retrieved chunks | 0.0–1.0 |
| **Latency** | Simulated response time in milliseconds | varies by config |

The current implementation uses a **deterministic simulation engine** (`simulateEvalRun`) that generates synthetic metrics based on RAG configuration parameters — no real LLM calls. To swap in real evaluation, replace `simulateEvalRun` in `artifacts/api-server/src/routes/eval-runs.ts`.

## Anonymous sessions

There is no authentication. Each browser gets a UUID stored in `localStorage["rag-eval.sessionId"]`, sent as the `X-Session-Id` header on every API request. This scopes human ratings, challenge attempts, and arena battles to a single browser session. The schema is ready for a future `user_id` column if authentication is added later.

## License

MIT
