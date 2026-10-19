# Mistake to Mastery — UPSC Polity Study Workspace

An independent, functional exam-preparation prototype that turns an incorrect answer into a structured learning loop:

**Attempt → Identify the mistake → Reflect → Learn the concept → Practise targeted questions → Revisit later → Retest with unseen questions → Measure improvement.**

This is a **product prototype**, not a landing page. The full mistake-to-mastery loop works end-to-end with persistent local state.

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS for styling
- lucide-react for icons
- **localStorage** for all persistence (no database, no API keys, no AI)

Per the project requirements, the app uses localStorage (not the available Supabase database) so the core loop works without any paid backend or external service.

## Running

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run typecheck
```

## Five sections

1. **Overview** — A single recommended next action with reasoning, plus six clearly-defined metrics (questions attempted, incorrect answers, revision tasks completed/total, retests completed, concepts due for review, concepts needing another review).
2. **Practice** — A working MCQ quiz with 18 original Indian Polity questions across 6 concepts. Filterable by concept. After submitting: concise feedback for correct answers; full breakdown (your answer, correct answer, why correct, why your answer is wrong, why every other option is wrong) for incorrect answers.
3. **My Mistakes** — Every incorrect answer is auto-added and grouped by topic → concept. Each concept shows mistake count, suspected error type, last mistake date, revision status, recommended next action, latest retest result with sample size, and the latest mistake question.
4. **Revision Coach** — Adaptive learning page per concept. The plan adapts to your self-reported suspected error type (knowledge gap, concept confusion, misunderstood question, wrong option, guessing, recall difficulty, unknown cause). Each page contains: simple-language summary, detailed explanation, side-by-side distinctions table, common traps, why your original answer was wrong, short takeaways, targeted practice, a "mark revision complete" button (which schedules a next-day follow-up retest), and a clear next step.
5. **My Progress** — Practice/reetest counts, correct vs incorrect by concept, original vs follow-up score comparisons with sample sizes, concept status (improving / unresolved / due for review), reflection pattern breakdown, and the Reset Demo button with confirmation.

## Data model

All state lives in a single localStorage key `m2m_state_v1`:

```ts
interface AppState {
  attempts: Attempt[];       // every question answer (practice, retest, review, coach_practice)
  reflections: Reflection[]; // self-reported error type + confidence per attempt
  revisionTasks: RevisionTask[]; // pending | completed | reviewed
  retests: Retest[];         // retest sessions with summary
  version: number;
}

interface Attempt {
  id: string;                // stable attempt ID
  questionId: string;        // stable question ID
  conceptId: string;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  timestamp: number;
  context: 'practice' | 'retest' | 'review' | 'coach_practice';
  retestId?: string;
}
```

Seed data (in `src/data.ts`):
- 6 **concepts** (Fundamental Rights, DPSP vs FR, Fundamental Duties, Amendments, Judicial Review & Writs, Centre-State Relations)
- 18 **questions** (3 per concept, each with 4 options, difficulty, explanation, why-correct, why-each-other-wrong)
- 6 **learning pages** (simple language, detailed explanation, distinctions, traps, takeaways)

## Retest logic (critical)

- Retests use **only the concepts from your mistakes**.
- Questions are selected from the bank with **different IDs** from any question you have already answered (in any context).
- The same concept is tested with **different wording/scenarios** — never the original question repeated.
- If a concept has **insufficient unseen questions**, the app says so explicitly and runs only what is available — it never substitutes an unrelated question or repeats an old one disguised as new.
- After a retest, the app compares original practice vs follow-up scores, shows concepts tested, number of questions, and how many were new vs repeated.
- A perfect score on a 1–4 question retest is labelled an **early signal**, never "mastery".

## Delayed review

Completing a revision task schedules a follow-up retest for the next day (stored locally with a due date). The app never claims to send notifications. You may start a scheduled review early for testing — the original due date is retained.

## Demo flow (end-to-end)

1. Open **Practice** → answer questions, get at least one wrong.
2. On an incorrect answer, submit the **quick reflection** (error type + confidence) or skip.
3. Open **My Mistakes** → find the concept grouped under its topic.
4. Open **Revision Coach** for that concept → read the 8-part learning page → mark revision complete (a next-day review is scheduled).
5. From My Mistakes, **start a retest** for that concept → the questions are unseen but map to the same concept.
6. Submit the retest → see the original-vs-follow-up comparison with sample sizes.
7. Open **My Progress** → see the comparison, concept status, and reflection patterns.
8. **Refresh** the browser → everything persists.
9. **Reset Demo** (in My Progress or the sidebar) → clears all local state back to a valid empty initial state.

## Limitations

- All questions, explanations and learning material are **original synthetic demo content** labelled as illustrative. They are not exhaustive and are not sourced from external references.
- No AI is used. The adaptive plan is driven by **deterministic rules** keyed on your self-reported suspected error type.
- Reflections are self-reported and treated as suspected causes, not proven diagnoses.
- Small retest sample sizes give only early signals — the app never claims lasting mastery.
- No accounts, no sync across devices, no server-side persistence — all data lives in this browser's localStorage.
- No push/email notifications; the delayed review is an in-app reminder only.
