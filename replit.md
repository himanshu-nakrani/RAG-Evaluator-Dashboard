# Workspace

## Overview

RAGrade — a developer tool for ML engineers to test retrieval pipelines. Upload documents, create question sets, configure experiments (chunk size, embedding model, retriever type), run evaluations, and visualize faithfulness, context recall, and latency metrics.

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

- **rag-eval** (`/`) — RAGrade frontend (React + Vite)
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

## UI Features

- **Dark Mode** — system preference detection + manual toggle (Moon/Sun icon in sidebar footer). Theme stored in `localStorage`. CSS vars defined in `index.css` `.dark` class.
- **Theme Context** — `src/contexts/theme-context.tsx` provides `useTheme()` hook with `theme`, `setTheme`, `resolvedTheme`.
- **Keyboard Shortcuts** — `src/hooks/use-keyboard-shortcut.ts` hook. `⌘N` = new item, `⌘K` = focus search, `?` = shortcuts panel, `Esc` = clear search. Shortcuts panel in sidebar footer.
- **Search & Filter** — client-side live search on all list pages (documents, experiments, question-sets, sweeps, leaderboard) and all detail pages. `useMemo` filtering. `⌘K` hint in placeholder. Debounced via `useDebounce` hook (250ms) to avoid re-renders on every keystroke.
- **URL State** — search query and sort/filter state is persisted to URL search params on all 5 list pages (`?q=...&sort=...`) using lazy `useState` init + `useEffect` sync via `history.replaceState`. Filters survive page refresh and back-navigation.
- **Clear Filters** — each list page shows a "Clear" button in the toolbar whenever any filter is non-default. Resets all filters and page at once.
- **Sort Controls** — sort dropdown on all list pages and detail pages. Options vary by page (newest/oldest, name A-Z, best score, most runs, etc.).
- **Pagination** — 10-15 items per page on all list/detail pages using shadcn `Pagination` component. Shows "X–Y of Z" count.
- **Bulk Actions** — multi-select checkboxes on Documents and Experiments pages. Floating action bar with bulk delete. Single AlertDialog confirmation.
- **Tooltips** — `<FieldTooltip>` component using Radix `Tooltip` on all technical form fields (Chunk Size, Chunk Overlap, Embedding Model, Retriever Type, Top K) in Experiments and Sweeps dialogs.
- **Status Filter Chips** — Sweeps page has pill filter chips for All / Running / Completed / Pending with live counts.
- **Export CSV** — Export buttons on: Leaderboard, Eval Run Detail, Question Set Detail, Experiment Trends, Experiment Comparison, Sweep Detail.
- **Error Messages** — `parseApiError()` helper in each CRUD page maps common error patterns (duplicate name, not found, network) to human-readable messages. Inline validation errors on required form fields.
- **Accessibility** — `aria-label` on all icon-only buttons, `aria-current="page"` on active nav, `role="list"/"listitem"` on card grids, `aria-hidden` on decorative icons, `aria-live` on bulk action bar.
- **Mobile Layout** — collapsible sidebar drawer on mobile (hamburger/X toggle, slide-in animation via Framer Motion `AnimatePresence`, backdrop overlay). Desktop sidebar unchanged.
- **Performance** — `React.memo` on `QuestionCard` in question-set-detail. `useDebounce` applied to all 8 pages with search inputs (5 list + 3 detail).

## Hooks

- `src/hooks/use-keyboard-shortcut.ts` — keyboard shortcut registration
- `src/hooks/use-debounce.ts` — 250ms debounce hook
- `src/hooks/use-url-state.ts` — URL search param state hook (available for future use)

## Notes

- Evaluation is simulated server-side with realistic metrics based on config parameters
- `lib/api-zod/src/index.ts` is patched post-codegen (only exports from `./generated/api` to avoid duplicate exports with types folder)
- Orval config in `lib/api-spec/orval.config.ts` does not generate a separate types schemas folder for the zod output

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
