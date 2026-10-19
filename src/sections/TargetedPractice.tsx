import { useMemo, useState } from 'react';
import { Play, ArrowRight, CheckCircle2, XCircle, RotateCcw, Info, AlertTriangle, BookOpen, TrendingUp } from 'lucide-react';
import { CONCEPTS, QUESTIONS } from '../data';
import { getMistakeSummaries, getQuestion } from '../selectors';
import { recordAttempt, useAppState } from '../store';
import { Card, Button, EmptyState } from '../components/AppShell';
import type { SectionId } from '../components/AppShell';
import { QuizRunner } from '../components/QuizRunner';
import { ReflectionForm } from '../components/ReflectionForm';
import type { Question } from '../types';

interface Props {
  conceptId: string;
  linkedMistakeAttemptId?: string;
  onDone: () => void;
  onNavigate: (s: SectionId) => void;
  onRetryWithNew: (conceptId: string) => void;
  onStartCoach: (conceptId: string) => void;
  onStartReview: (attemptId: string) => void;
}

const PRACTICE_TYPE = 'concept_practice_5';
const TARGET_COUNT = 5;

export function TargetedPractice({ conceptId, linkedMistakeAttemptId, onDone, onNavigate, onRetryWithNew, onStartCoach }: Props) {
  const state = useAppState();
  const concept = CONCEPTS.find((c) => c.id === conceptId);
  const [phase, setPhase] = useState<'intro' | 'active' | 'result'>('intro');
  const [sessionResults, setSessionResults] = useState<{ question: Question; selected: number; correct: boolean; attemptId: string }[]>([]);
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);

  // Build a 5-question set: prioritise unseen questions for this concept,
  // then fall back to seen ones if necessary (without pretending they are new).
  const practiceSet = useMemo(() => {
    const conceptQuestions = QUESTIONS.filter((q) => q.conceptId === conceptId);
    const answeredIds = new Set(state.attempts.map((a) => a.questionId));
    const unseen = conceptQuestions.filter((q) => !answeredIds.has(q.id));
    const seen = conceptQuestions.filter((q) => answeredIds.has(q.id));
    // Order unseen by difficulty to get basic→applied→trap progression
    const orderRank: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
    unseen.sort((a, b) => (orderRank[a.difficulty] ?? 1) - (orderRank[b.difficulty] ?? 1));
    const picked = [...unseen];
    if (picked.length < TARGET_COUNT) {
      for (const q of seen) {
        if (picked.length >= TARGET_COUNT) break;
        if (!picked.find((p) => p.id === q.id)) picked.push(q);
      }
    }
    return { questions: picked.slice(0, TARGET_COUNT), unseenCount: unseen.length, totalCount: conceptQuestions.length };
  }, [conceptId, state.attempts]);

  if (!concept) {
    return <EmptyState icon={AlertTriangle} title="Concept not found" body="This concept does not exist." action={<Button onClick={onDone}>Back</Button>} />;
  }

  if (practiceSet.questions.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No questions available for this concept"
        body="The question bank has no questions mapped to this concept. This should not happen in the demo — try Reset Demo if it persists."
        action={<Button onClick={onDone}>Back</Button>}
      />
    );
  }

  if (phase === 'intro') {
    const insufficient = practiceSet.questions.length < TARGET_COUNT;
    return (
      <div className="space-y-5">
        <button onClick={onDone} className="text-xs text-stone-500 hover:text-stone-800">&larr; Back</button>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Targeted practice</div>
          <h2 className="text-lg font-semibold text-stone-900">Practise this concept — {TARGET_COUNT} questions</h2>
          <p className="mt-1 text-sm text-stone-600">A focused set for <span className="font-medium">{concept.name}</span>. Each question tests a different aspect: basic understanding, application, distinguishing similar concepts, common exam traps, and a new scenario.</p>

          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Questions in this set</span>
              <span className="font-semibold text-stone-900">{practiceSet.questions.length} / {TARGET_COUNT}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
              <span>Unseen: {practiceSet.unseenCount}</span>
              <span>Total in bank for this concept: {practiceSet.totalCount}</span>
            </div>
            {insufficient && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Only {practiceSet.questions.length} question(s) available.</p>
                  <p className="mt-1">The bank has {practiceSet.totalCount} questions for this concept and you have answered some already. This set includes {practiceSet.unseenCount} unseen question(s) and {practiceSet.questions.length - practiceSet.unseenCount} previously seen one(s) so you are not left stuck. No unrelated questions are substituted, and no question is disguised as new.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setPhase('active')}><Play size={14} /> Start {TARGET_COUNT}-question practice</Button>
            <Button variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'active') {
    return (
      <QuizRunner
        questions={practiceSet.questions}
        title={`Targeted practice — ${concept.name}`}
        subtitle="Immediate feedback after each answer. Your answers are saved and any new mistakes are added to My Mistakes."
        contextLabel="Concept practice"
        onExit={() => { setPhase('intro'); setSessionResults([]); }}
        exitLabel="Stop practice"
        onSubmitQuestion={(res) => {
          const att = recordAttempt({
            questionId: res.question.id,
            conceptId: res.question.conceptId,
            selectedOption: res.selected,
            correctOption: res.question.correctOption,
            context: 'coach_practice',
            practiceType: PRACTICE_TYPE,
            linkedMistakeAttemptId,
          });
          setSessionResults((prev) => [...prev, { question: res.question, selected: res.selected, correct: res.correct, attemptId: att.id }]);
        }}
        renderAfterEach={(_res, _idx) => {
          const last = sessionResults[sessionResults.length - 1];
          if (!last || last.correct) return null;
          return (
            <div className="mt-3" key={`ref-${last.attemptId}`}>
              <ReflectionForm attemptId={last.attemptId} />
            </div>
          );
        }}
        onFinish={() => setPhase('result')}
      />
    );
  }

  // Result phase
  const correctCount = sessionResults.filter((r) => r.correct).length;
  const total = sessionResults.length;
  const incorrect = sessionResults.filter((r) => !r.correct);
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const learningObjectives = deriveLearningObjectives(practiceSet.questions);

  const recommendation = (() => {
    if (total === 0) return 'No answers were recorded.';
    if (pct >= 80) return `Strong initial indicator (${correctCount}/${total}). This is an early signal of understanding, not proof of mastery. Schedule a later retest or retry with new questions to confirm retention.`;
    if (pct >= 50) return `Partial understanding (${correctCount}/${total}). Review the incorrect answers below, then continue revision in the Revision Coach before retrying.`;
    return `Needs more work (${correctCount}/${total}). Revisit the concept in the Revision Coach, then retry with new questions. Do not treat this as a final verdict — it is a short set.`;
  })();

  return (
    <div className="space-y-5">
      <button onClick={onDone} className="text-xs text-stone-500 hover:text-stone-800">&larr; Back</button>

      <Card>
        <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Practice complete</div>
        <h2 className="text-lg font-semibold text-stone-900">{concept.name} — targeted practice result</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ScoreCard label="Score" value={`${correctCount} / ${total}`} sub={`${pct}%`} />
          <ScoreCard label="Correct" value={String(correctCount)} icon={<CheckCircle2 size={16} className="text-emerald-600" />} />
          <ScoreCard label="Incorrect" value={String(incorrect.length)} icon={<XCircle size={16} className="text-red-500" />} />
        </div>

        <div className="mt-4 rounded-lg bg-stone-50 p-4 text-sm">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Learning objectives tested</div>
          <ul className="space-y-1 text-stone-700">
            {learningObjectives.map((o, i) => (
              <li key={i} className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 shrink-0 text-stone-400" /> {o}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>{recommendation}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => onRetryWithNew(conceptId)}><RotateCcw size={14} /> Retry with new questions</Button>
          <Button variant="secondary" onClick={() => onStartCoach(conceptId)}><BookOpen size={14} /> Continue in Revision Coach</Button>
          <Button variant="secondary" onClick={() => onNavigate('mistakes')}><ArrowRight size={14} /> Go to My Mistakes</Button>
          <Button variant="ghost" onClick={onDone}>Done</Button>
        </div>
      </Card>

      {incorrect.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800"><XCircle size={16} className="text-red-500" /> Review incorrect answers</div>
          <div className="space-y-2">
            {incorrect.map((r) => {
              const open = openReviewId === r.attemptId;
              return (
                <div key={r.attemptId} className="rounded-lg border border-stone-100">
                  <button onClick={() => setOpenReviewId(open ? null : r.attemptId)} className="flex w-full items-center gap-3 p-3 text-left text-sm">
                    {open ? <ArrowRight size={14} className="rotate-90 text-stone-400" /> : <ArrowRight size={14} className="text-stone-400" />}
                    <span className="min-w-0 flex-1 truncate text-stone-800">{r.question.prompt}</span>
                    <span className="shrink-0 text-xs text-red-500">Incorrect</span>
                  </button>
                  {open && (
                    <div className="border-t border-stone-100 p-4">
                      <FullAnswerReview question={r.question} selected={r.selected} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {incorrect.length === 0 && (
        <Card className="bg-emerald-50/40">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800"><TrendingUp size={16} /> All correct in this set</div>
          <p className="mt-1 text-xs text-emerald-900/80">A perfect score on a short set is an early positive signal. It does not prove lasting mastery — schedule a retest later to confirm retention.</p>
        </Card>
      )}

      <Card className="bg-stone-50">
        <p className="flex items-start gap-2 text-[11px] text-stone-500"><Info size={12} className="mt-0.5 shrink-0" /> Every answer in this set was saved with its question ID, concept, selected option, correctness, attempt ID and timestamp. Any incorrect answer was added to My Mistakes without overwriting your original mistake.</p>
      </Card>
    </div>
  );
}

function ScoreCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-stone-900">{icon}{value}</div>
      {sub && <div className="text-xs text-stone-500">{sub}</div>}
    </div>
  );
}

function FullAnswerReview({ question, selected }: { question: Question; selected: number }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-stone-800"><span className="font-medium">Question:</span> {question.prompt}</p>
      <div className="space-y-1">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctOption;
          const isSelected = i === selected;
          let cls = 'border-stone-200 text-stone-600';
          if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-stone-800';
          else if (isSelected) cls = 'border-red-300 bg-red-50 text-stone-800';
          return (
            <div key={i} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${cls}`}>
              <span className="font-semibold">{String.fromCharCode(65 + i)}.</span>
              <span className="flex-1">{opt}</span>
              {isCorrect && <span className="text-[11px] font-medium text-emerald-700">Correct</span>}
              {isSelected && !isCorrect && <span className="text-[11px] font-medium text-red-600">Your answer</span>}
            </div>
          );
        })}
      </div>
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <p className="font-medium text-emerald-700">Why the correct answer is correct</p>
        <p className="mt-1 text-stone-700">{question.whyCorrect}</p>
      </div>
      <div className="rounded-md border border-red-200 bg-red-50 p-3">
        <p className="font-medium text-red-700">Why your answer was wrong</p>
        <p className="mt-1 text-stone-700">{question.whyOthersWrong[selected]}</p>
      </div>
      <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
        <p className="font-medium text-stone-800">Concept reminder</p>
        <p className="mt-1 text-stone-700">{question.explanation}</p>
      </div>
    </div>
  );
}

function deriveLearningObjectives(questions: Question[]): string[] {
  const objectives: string[] = [];
  const ranks: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const sorted = [...questions].sort((a, b) => (ranks[a.difficulty] ?? 1) - (ranks[b.difficulty] ?? 1));
  const labels = ['Basic understanding', 'Application of the concept', 'Distinguishing similar concepts', 'Common misconception or exam trap', 'New scenario or mixed application'];
  sorted.forEach((q, i) => {
    const label = labels[i] ?? `Applied question ${i + 1}`;
    objectives.push(`${label}: ${truncate(q.prompt, 90)}`);
  });
  return objectives;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function getUnseenCountForConcept(conceptId: string, answeredQuestionIds: Set<string>): number {
  return QUESTIONS.filter((q) => q.conceptId === conceptId && !answeredQuestionIds.has(q.id)).length;
}

export function hasEnoughForTargetedPractice(conceptId: string): boolean {
  return QUESTIONS.filter((q) => q.conceptId === conceptId).length > 0;
}

export function TargetedPracticeButtonRow({ conceptId, onStart, size = 'md' }: { conceptId: string; onStart: () => void; size?: 'sm' | 'md' }) {
  const state = useAppState();
  const answered = new Set(state.attempts.map((a) => a.questionId));
  const unseen = getUnseenCountForConcept(conceptId, answered);
  const total = QUESTIONS.filter((q) => q.conceptId === conceptId).length;
  const cls = size === 'sm' ? 'text-xs' : '';
  return (
    <div className="flex flex-col gap-1">
      <Button onClick={onStart} className={cls}><Play size={size === 'sm' ? 12 : 14} /> Practise this concept — {Math.min(TARGET_COUNT, total)} questions</Button>
      <span className="text-[11px] text-stone-500">{unseen} unseen available · {total} total in bank</span>
    </div>
  );
}

// Re-export for convenience used by My Mistakes
export function getMistakeSummariesForMistakes(state: ReturnType<typeof useAppState>) {
  return getMistakeSummaries(state);
}

export function getQuestionById(id: string) {
  return getQuestion(id);
}
