import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppState, Attempt, Confidence, ErrorType, Reflection, Retest, RevisionTask,
} from './types';

const STORAGE_KEY = 'm2m_state_v1';
const INITIAL_STATE: AppState = {
  attempts: [], reflections: [], revisionTasks: [], retests: [], version: 1,
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_STATE };
    const parsed = JSON.parse(raw) as AppState;
    return {
      attempts: parsed.attempts ?? [],
      reflections: parsed.reflections ?? [],
      revisionTasks: parsed.revisionTasks ?? [],
      retests: parsed.retests ?? [],
      version: 1,
    };
  } catch {
    return { ...INITIAL_STATE };
  }
}

let listeners: (() => void)[] = [];
let state: AppState = loadState();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  persist();
}

export function useAppState(): AppState {
  const [, force] = useState(0);
  const ref = useRef<() => void>();
  if (!ref.current) {
    ref.current = () => force((n) => n + 1);
  }
  useEffect(() => {
    const cb = ref.current!;
    listeners.push(cb);
    return () => { listeners = listeners.filter((l) => l !== cb); };
  }, []);
  return state;
}

export function resetDemo() {
  setState(() => ({ ...INITIAL_STATE }));
}

function uid(prefix = 'a'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function recordAttempt(input: {
  questionId: string;
  conceptId: string;
  selectedOption: number;
  correctOption: number;
  context: Attempt['context'];
  retestId?: string;
  practiceType?: string;
  linkedMistakeAttemptId?: string;
}): Attempt {
  const attempt: Attempt = {
    id: uid('att'),
    questionId: input.questionId,
    conceptId: input.conceptId,
    selectedOption: input.selectedOption,
    correctOption: input.correctOption,
    isCorrect: input.selectedOption === input.correctOption,
    timestamp: Date.now(),
    context: input.context,
    retestId: input.retestId,
    practiceType: input.practiceType,
    linkedMistakeAttemptId: input.linkedMistakeAttemptId,
  };
  setState((s) => ({ ...s, attempts: [...s.attempts, attempt] }));
  return attempt;
}

export function saveReflection(reflection: {
  attemptId: string;
  errorType: ErrorType | null;
  confidence: Confidence | null;
}) {
  const r: Reflection = {
    attemptId: reflection.attemptId,
    errorType: reflection.errorType,
    confidence: reflection.confidence,
    savedAt: Date.now(),
  };
  setState((s) => {
    const others = s.reflections.filter((x) => x.attemptId !== r.attemptId);
    return { ...s, reflections: [...others, r] };
  });
}

export function getReflectionFor(attemptId: string): Reflection | undefined {
  return state.reflections.find((r) => r.attemptId === attemptId);
}

export function createRevisionTask(conceptId: string): RevisionTask {
  const task: RevisionTask = {
    id: uid('rev'),
    conceptId,
    status: 'pending',
    createdAt: Date.now(),
  };
  setState((s) => ({ ...s, revisionTasks: [...s.revisionTasks, task] }));
  return task;
}

export function completeRevisionTask(taskId: string): RevisionTask | undefined {
  const now = Date.now();
  const due = now + 24 * 60 * 60 * 1000;
  setState((s) => ({
    ...s,
    revisionTasks: s.revisionTasks.map((t) =>
      t.id === taskId ? { ...t, status: 'completed', completedAt: now, reviewDueAt: due } : t
    ),
  }));
  return state.revisionTasks.find((t) => t.id === taskId);
}

export function createRetest(retest: Omit<Retest, 'id' | 'startedAt'>): Retest {
  const r: Retest = { id: uid('ret'), startedAt: Date.now(), ...retest };
  setState((s) => ({ ...s, retests: [...s.retests, r] }));
  return r;
}

export function completeRetest(
  retestId: string,
  summary: Retest['summary']
) {
  setState((s) => ({
    ...s,
    retests: s.retests.map((r) =>
      r.id === retestId ? { ...r, completedAt: Date.now(), summary } : r
    ),
    revisionTasks: s.revisionTasks.map((t) =>
      t.reviewRetestId === retestId ? { ...t, status: 'reviewed' } : t
    ),
  }));
}

export function attachReviewRetest(taskId: string, retestId: string) {
  setState((s) => ({
    ...s,
    revisionTasks: s.revisionTasks.map((t) =>
      t.id === taskId ? { ...t, reviewRetestId: retestId } : t
    ),
  }));
}

export const useStore = { resetDemo, recordAttempt, saveReflection, getReflectionFor, createRevisionTask, completeRevisionTask, createRetest, completeRetest, attachReviewRetest };


export function useResetDemo() {
  return useCallback(() => resetDemo(), []);
}
