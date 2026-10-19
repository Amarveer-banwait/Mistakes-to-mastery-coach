import { CONCEPTS, QUESTIONS } from './data';
import type { AppState, Attempt, Concept, ErrorType, Question } from './types';

export const getConcept = (id: string): Concept | undefined =>
  CONCEPTS.find((c) => c.id === id);

export const getQuestion = (id: string): Question | undefined =>
  QUESTIONS.find((q) => q.id === id);

export interface ConceptMistakeSummary {
  conceptId: string;
  concept: Concept;
  mistakeCount: number;
  lastMistakeAt: number;
  errorTypes: { type: ErrorType; count: number }[];
  hasErrorType: boolean;
  revisionStatus: RevisionStatus;
  revisionTaskId?: string;
  reviewDueAt?: number;
  reviewRetestId?: string;
  retestResults: { score: number; total: number; retestId: string }[];
  recommendedAction: string;
  recentMistakeAttempt?: Attempt;
}

export type RevisionStatus = 'none' | 'pending' | 'completed' | 'reviewed';

export function getAllAttempts(state: AppState): Attempt[] {
  return [...state.attempts].sort((a, b) => a.timestamp - b.timestamp);
}

export function getIncorrectAttempts(state: AppState): Attempt[] {
  return state.attempts.filter((a) => !a.isCorrect);
}

export function getAnsweredQuestionIds(state: AppState): Set<string> {
  return new Set(state.attempts.map((a) => a.questionId));
}

export function getMistakeSummaries(state: AppState): ConceptMistakeSummary[] {
  const incorrect = getIncorrectAttempts(state);
  const byConcept = new Map<string, Attempt[]>();
  for (const a of incorrect) {
    const arr = byConcept.get(a.conceptId) ?? [];
    arr.push(a);
    byConcept.set(a.conceptId, arr);
  }

  const summaries: ConceptMistakeSummary[] = [];
  for (const [conceptId, attempts] of byConcept.entries()) {
    const concept = getConcept(conceptId);
    if (!concept) continue;
    const errorCounts = new Map<ErrorType, number>();
    let hasErrorType = false;
    for (const a of attempts) {
      const r = state.reflections.find((x) => x.attemptId === a.id);
      if (r?.errorType) {
        hasErrorType = true;
        errorCounts.set(r.errorType, (errorCounts.get(r.errorType) ?? 0) + 1);
      }
    }
    const errorTypes = [...errorCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const tasks = state.revisionTasks.filter((t) => t.conceptId === conceptId);
    const latestTask = tasks.sort((a, b) => b.createdAt - a.createdAt)[0];
    const revisionStatus: RevisionStatus = latestTask?.status ?? 'none';

    const retestResults: { score: number; total: number; retestId: string }[] = [];
    for (const t of tasks) {
      if (t.reviewRetestId) {
        const rt = state.retests.find((r) => r.id === t.reviewRetestId);
        if (rt?.summary) retestResults.push({ score: rt.summary.score, total: rt.summary.total, retestId: rt.id });
      }
    }
    // also retests that covered this concept (practice retests)
    for (const rt of state.retests) {
      if (rt.type === 'retest' && rt.conceptIds.includes(conceptId) && rt.summary) {
        if (!retestResults.find((r) => r.retestId === rt.id)) {
          retestResults.push({ score: rt.summary.score, total: rt.summary.total, retestId: rt.id });
        }
      }
    }

    const recentMistakeAttempt = attempts.sort((a, b) => b.timestamp - a.timestamp)[0];
    const recommendedAction = recommendAction(revisionStatus, errorTypes[0]?.type, retestResults);

    summaries.push({
      conceptId,
      concept,
      mistakeCount: attempts.length,
      lastMistakeAt: Math.max(...attempts.map((a) => a.timestamp)),
      errorTypes,
      hasErrorType,
      revisionStatus,
      revisionTaskId: latestTask?.id,
      reviewDueAt: latestTask?.reviewDueAt,
      reviewRetestId: latestTask?.reviewRetestId,
      retestResults,
      recommendedAction,
      recentMistakeAttempt,
    });
  }
  return summaries.sort((a, b) => b.lastMistakeAt - a.lastMistakeAt);
}

function recommendAction(status: RevisionStatus, topError: ErrorType | undefined, retestResults: { score: number; total: number }[]): string {
  if (status === 'none') return 'Open the Revision Coach to study this concept.';
  if (status === 'pending') return 'Continue and complete the learning task in the Revision Coach.';
  if (status === 'completed') return 'A follow-up retest is scheduled for tomorrow. You may start it early from My Mistakes.';
  if (status === 'reviewed') {
    if (retestResults.length) {
      const last = retestResults[retestResults.length - 1];
      const ratio = last.score / last.total;
      if (ratio >= 1) return `Retest result: ${last.score}/${last.total}. Early positive signal — but a single small retest does not prove mastery. Try another retest to gather more evidence.`;
      if (ratio >= 0.5) return `Retest result: ${last.score}/${last.total}. Partial improvement — review the concept again and attempt another retest.`;
      return `Retest result: ${last.score}/${last.total}. Still unresolved — revisit the concept and practise again.`;
    }
    return 'Review completed. Attempt another retest to gather more evidence.';
  }
  return 'Review this concept.';
}

export function pickRetestQuestions(
  state: AppState,
  conceptIds: string[],
  count: number
): { questions: Question[]; available: number; requested: number; insufficient: boolean } {
  const answered = getAnsweredQuestionIds(state);
  const pool: Question[] = [];
  for (const cid of conceptIds) {
    for (const q of QUESTIONS.filter((q) => q.conceptId === cid)) {
      if (!answered.has(q.id)) pool.push(q);
    }
  }
  const available = pool.length;
  const insufficient = available < count;
  const chosen = pool.slice(0, Math.min(count, available));
  return { questions: chosen, available, requested: count, insufficient };
}

export function pickCoachPracticeQuestions(conceptId: string, excludeIds: string[], count: number): Question[] {
  return QUESTIONS.filter((q) => q.conceptId === conceptId && !excludeIds.includes(q.id)).slice(0, count);
}

export interface OverviewMetric {
  label: string;
  value: string;
  hint?: string;
}

export function getOverviewMetrics(state: AppState): OverviewMetric[] {
  const total = state.attempts.length;
  const incorrect = state.attempts.filter((a) => !a.isCorrect).length;
  const tasks = state.revisionTasks;
  const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'reviewed').length;
  const retests = state.retests.filter((r) => r.completedAt).length;
  const dueReviews = tasks.filter((t) => t.status === 'completed' && t.reviewDueAt && t.reviewDueAt <= Date.now()).length;
  const needReview = getMistakeSummaries(state).filter((s) => s.revisionStatus === 'none' || (s.revisionStatus === 'reviewed' && s.retestResults.length && s.retestResults[s.retestResults.length - 1].score / s.retestResults[s.retestResults.length - 1].total < 0.5)).length;
  return [
    { label: 'Questions attempted', value: String(total), hint: 'All practice, retest, and coach questions' },
    { label: 'Incorrect answers', value: String(incorrect) },
    { label: 'Revision tasks completed', value: `${completed} / ${tasks.length}`, hint: tasks.length ? undefined : 'No revision tasks yet' },
    { label: 'Retests completed', value: String(retests) },
    { label: 'Concepts due for review', value: String(dueReviews), hint: dueReviews ? 'Scheduled retests ready now' : undefined },
    { label: 'Concepts needing another review', value: String(needReview) },
  ];
}

export function getOverviewRecommendation(state: AppState): { conceptId: string; text: string; conceptName: string } | null {
  const summaries = getMistakeSummaries(state);
  if (!summaries.length) return null;
  // priority: none > pending > reviewed-with-low-score > completed(due)
  const none = summaries.find((s) => s.revisionStatus === 'none');
  if (none) {
    const top = none.errorTypes[0];
    return {
      conceptId: none.conceptId,
      conceptName: none.concept.name,
      text: `Review ${none.concept.name} — you missed ${none.mistakeCount} question${none.mistakeCount > 1 ? 's' : ''}${top ? ` and reported "${top.type === 'concept_confusion' ? 'confusion between similar concepts' : top.type === 'no_knowledge' ? 'a knowledge gap' : 'a self-reported error type'}"` : '.'}`,
    };
  }
  const due = summaries.find((s) => s.revisionStatus === 'completed' && s.reviewDueAt && s.reviewDueAt <= Date.now());
  if (due) return { conceptId: due.conceptId, conceptName: due.concept.name, text: `Your follow-up retest for ${due.concept.name} is due now.` };
  const pending = summaries.find((s) => s.revisionStatus === 'pending');
  if (pending) return { conceptId: pending.conceptId, conceptName: pending.concept.name, text: `Continue the pending learning task for ${pending.concept.name}.` };
  const low = summaries.find((s) => s.revisionStatus === 'reviewed' && s.retestResults.length && s.retestResults[s.retestResults.length - 1].score / s.retestResults[s.retestResults.length - 1].total < 0.5);
  if (low) return { conceptId: low.conceptId, conceptName: low.concept.name, text: `${low.concept.name} is still unresolved based on your last retest. Practise again.` };
  return null;
}

export function getProgressByConcept(state: AppState) {
  const map = new Map<string, { concept: Concept; practiceCorrect: number; practiceIncorrect: number; retestCorrect: number; retestIncorrect: number }>();
  for (const c of CONCEPTS) {
    map.set(c.id, { concept: c, practiceCorrect: 0, practiceIncorrect: 0, retestCorrect: 0, retestIncorrect: 0 });
  }
  for (const a of state.attempts) {
    const entry = map.get(a.conceptId);
    if (!entry) continue;
    if (a.context === 'retest' || a.context === 'review') {
      if (a.isCorrect) entry.retestCorrect++; else entry.retestIncorrect++;
    } else {
      if (a.isCorrect) entry.practiceCorrect++; else entry.practiceIncorrect++;
    }
  }
  return [...map.values()];
}

export function getRetestComparisons(state: AppState) {
  return state.retests
    .filter((r) => r.completedAt && r.summary)
    .map((r) => {
      const originalCorrect = state.attempts.filter((a) => a.context === 'practice' && r.conceptIds.includes(a.conceptId)).filter((a) => a.isCorrect).length;
      const originalTotal = state.attempts.filter((a) => a.context === 'practice' && r.conceptIds.includes(a.conceptId)).length;
      return {
        retest: r,
        original: { correct: originalCorrect, total: originalTotal },
        followup: { correct: r.summary!.score, total: r.summary!.total },
        newQuestions: r.summary!.newQuestionCount,
        repeated: r.summary!.repeatedQuestionCount,
      };
    });
}

export function getReflectionPatterns(state: AppState) {
  const counts = new Map<ErrorType, number>();
  for (const r of state.reflections) {
    if (r.errorType) counts.set(r.errorType, (counts.get(r.errorType) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return { counts: [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count), total };
}

export function getUnansweredQuestionCount(state: AppState): number {
  return QUESTIONS.length - getAnsweredQuestionIds(state).size;
}
