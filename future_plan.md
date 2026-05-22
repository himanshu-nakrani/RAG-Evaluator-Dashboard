### Project Goal
Transform the current RAG evaluation dashboard into a more **engaging, useful, and fun** tool by adding:

- Blind Evaluation Mode
- Preset Scenarios + Challenge Mode
- RAG Arena (side-by-side battles)

We’ll do this in **3 clear phases** so you can ship value quickly.

---

### Overall Tech Assumptions
- **Frontend**: TypeScript + React (or Next.js)
- **Backend**: Likely Node.js / Express (based on your other projects)
- **Database**: PostgreSQL (you already use it in Knowledge-Weaver)
- Current features: Document upload, question sets, experiment running, metric visualization

---

## Phase 1: Blind Evaluation Mode (Recommended First)

**Goal**: Remove bias by hiding which RAG system produced which answer.

### Features
- Toggle **"Blind Mode"** when creating an evaluation
- During review, answers are shown without revealing which RAG/system produced them
- After user rates, reveal the actual systems + metrics
- Store human preference scores separately from automated metrics

### Implementation Steps

| Step | Task | Details | Effort |
|------|------|--------|--------|
| 1 | Add `is_blind` flag | Add field in evaluation/experiment table | Low |
| 2 | Modify answer display | Hide system name/model when `is_blind = true` | Medium |
| 3 | Add rating UI | Allow user to rate answers (1-5 or thumbs) before revealing | Medium |
| 4 | Reveal screen | After submission, show which system produced what + comparison | Medium |
| 5 | Store human preference | New table/column for human ratings | Low |
| 6 | Dashboard update | Show "Human Preference" as a new metric | Low |

**Estimated Time**: 4–7 hours

---

## Phase 2: Preset Scenarios + Challenge Mode

**Goal**: Make the tool easier and more fun to use repeatedly.

### Features
- **Preset Scenarios**: Curated document + question set combinations (e.g., Technical Docs, Legal, Customer Support, Fantasy Lore)
- **Challenge Mode**: Daily/Weekly random challenge with scoring
- Ability to save and share presets

### Implementation Steps

| Step | Task | Details | Effort |
|------|------|--------|--------|
| 1 | Create `presets` table | Store name, description, documents, questions | Low |
| 2 | Seed initial presets | Add 4–5 good starter presets | Low |
| 3 | Preset selection UI | Add "Use Preset" button on new evaluation screen | Medium |
| 4 | Challenge Mode | Add a "Start Daily Challenge" button that picks a random preset | Medium |
| 5 | Scoring system | Give points based on evaluation quality/completeness | Medium |
| 6 | Leaderboard (optional) | Simple personal streak or score tracking | Medium |

**Estimated Time**: 5–8 hours

---

## Phase 3: RAG Arena Mode (Most Fun)

**Goal**: Let users pit two RAG systems against each other.

### Features
- Select **two different RAG configurations**
- Run the same questions on both
- Side-by-side comparison view
- Clear winner based on metrics + human vote
- Simple arena-style UI

### Implementation Steps

| Step | Task | Details | Effort |
|------|------|--------|--------|
| 1 | Support multiple RAG configs per evaluation | Allow selecting 2 systems/configs | Medium |
| 2 | Parallel execution | Run both RAGs for the same questions | Medium |
| 3 | Side-by-side UI | Show answers from System A vs System B | Medium-High |
| 4 | Winner calculation | Combine automated metrics + human preference | Medium |
| 5 | Arena visualization | Add fun elements (winner badge, comparison cards) | Medium |
| 6 | History of battles | Allow users to see past arena results | Low |

**Estimated Time**: 8–12 hours

---

### Recommended Roadmap

| Phase | Feature | Priority | Est. Time | Ship Order |
|-------|---------|----------|-----------|------------|
| **1** | Blind Evaluation Mode | High | 4–7 hrs | **Start here** |
| **2** | Preset Scenarios + Challenges | High | 5–8 hrs | After Phase 1 |
| **3** | RAG Arena | High (Fun) | 8–12 hrs | Last |

**Total estimated time** (all 3 phases): **17–27 hours**

---

### Additional Recommendations

| Area | Suggestion | Reason |
|------|------------|--------|
| **Database** | Add tables: `presets`, `human_ratings`, `arena_battles` | Clean separation |
| **UI/UX** | Use cards + clear "Reveal" buttons in Blind mode | Better experience |
| **Gamification** | Add simple points/streaks in Challenge mode | Increases engagement |
| **Extensibility** | Make it easy to add new metrics later | Future-proofing |
| **Testing** | Focus on the evaluation flow first | Core feature |

---
