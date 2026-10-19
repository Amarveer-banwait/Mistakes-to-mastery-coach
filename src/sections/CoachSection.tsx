import { useMemo, useState } from 'react';
import { GraduationCap, ArrowRight, CheckCircle2, BookOpen, Lightbulb, AlertTriangle, Target, Play, Info } from 'lucide-react';
import { CONCEPTS, LEARNING, QUESTIONS } from '../data';
import { completeRevisionTask, createRevisionTask, getReflectionFor, recordAttempt, useAppState } from '../store';
import { getMistakeSummaries } from '../selectors';
import { ERROR_TYPE_LABELS, type ErrorType } from '../types';
import { Card, Button, EmptyState } from '../components/AppShell';
import type { SectionId } from '../components/AppShell';
import { QuizRunner } from '../components/QuizRunner';

interface Props {
  selectedConceptId: string | null;
  onSelectConcept: (id: string | null) => void;
  onStartReviewRetest: (taskId: string, conceptId: string) => void;
  onNavigate: (s: SectionId) => void;
  onStartTargeted: (conceptId: string, linkedMistakeAttemptId?: string) => void;
  onStartReview: (attemptId: string) => void;
}

const ERROR_TYPE_GUIDANCE: Record<ErrorType, { title: string; approach: string }> = {
  no_knowledge: { title: 'Knowledge gap', approach: 'We will explain the fundamentals from scratch, then test with easier and applied questions.' },
  concept_confusion: { title: 'Concept confusion', approach: 'We will compare the similar concepts side-by-side, then test the distinctions directly.' },
  misunderstood_question: { title: 'Question misunderstanding', approach: 'We will explain important wording patterns and practise interpreting similar questions.' },
  wrong_option_selected: { title: 'Wrong option selected', approach: 'We will explain option elimination and careful selection.' },
  guessing: { title: 'Guessing', approach: 'We will practise retrieval and help you distinguish knowledge from uncertainty.' },
  recall_difficulty: { title: 'Recall difficulty', approach: 'We will provide a compact summary and retrieval practice.' },
  unknown_cause: { title: 'Unknown cause', approach: 'We will give a general explanation followed by a short diagnostic quiz.' },
};

export function CoachSection({ selectedConceptId, onSelectConcept, onStartReviewRetest, onNavigate, onStartTargeted, onStartReview }: Props) {
  const state = useAppState();
  const summaries = getMistakeSummaries(state);
  const mistakesConceptIds = new Set(summaries.map((s) => s.conceptId));

  if (selectedConceptId) {
    return <CoachDetail conceptId={selectedConceptId} onBack={() => onSelectConcept(null)} onStartReviewRetest={onStartReviewRetest} onNavigate={onNavigate} onStartTargeted={onStartTargeted} onStartReview={onStartReview} />;
  }

  return (
    <div className="space-y-5">
      <Card className="bg-stone-50">
        <p className="text-xs text-stone-600">
          The Revision Coach adapts its learning plan to your self-reported suspected error type. Open a concept from your mistakes to begin, or preview any concept. Learning material is illustrative, original demo content.
        </p>
      </Card>

      {summaries.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No mistakes to coach yet"
          body="Answer questions in Practice first. Once you have incorrect answers, the Revision Coach will build an adaptive learning plan for each affected concept."
          action={<Button onClick={() => onNavigate('practice')}>Go to Practice</Button>}
        />
      ) : (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Concepts from your mistakes</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {summaries.map((s) => {
              const top = s.errorTypes[0]?.type;
              const g = top ? ERROR_TYPE_GUIDANCE[top] : null;
              return (
                <Card key={s.conceptId}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-stone-900">{s.concept.name}</div>
                      <div className="text-xs text-stone-500">{s.concept.topic} · {s.mistakeCount} mistake(s)</div>
                    </div>
                    <StatusBadge status={s.revisionStatus} />
                  </div>
                  <p className="mt-2 text-xs text-stone-600">{s.recommendedAction}</p>
                  {g && <p className="mt-1 text-xs text-stone-500">Plan: {g.approach}</p>}
                  <div className="mt-3">
                    <Button onClick={() => onSelectConcept(s.conceptId)} className="text-xs">Open learning page <ArrowRight size={14} /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">All concepts (preview)</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {CONCEPTS.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectConcept(c.id)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${mistakesConceptIds.has(c.id) ? 'border-emerald-200 bg-emerald-50/40 text-stone-800 hover:bg-emerald-50' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}
            >
              <span className="min-w-0 truncate">{c.name}</span>
              <ArrowRight size={14} className="shrink-0 text-stone-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoachDetail({ conceptId, onBack, onStartReviewRetest, onNavigate, onStartTargeted, onStartReview }: {
  conceptId: string;
  onBack: () => void;
  onStartReviewRetest: (taskId: string, conceptId: string) => void;
  onNavigate: (s: SectionId) => void;
  onStartTargeted: (conceptId: string, linkedMistakeAttemptId?: string) => void;
  onStartReview: (attemptId: string) => void;
}) {
  const state = useAppState();
  const concept = CONCEPTS.find((c) => c.id === conceptId);
  const learning = LEARNING.find((l) => l.conceptId === conceptId);
  const summary = getMistakeSummaries(state).find((s) => s.conceptId === conceptId);
  const topError = summary?.errorTypes[0]?.type;
  const [practiceActive, setPracticeActive] = useState(false);

  const task = state.revisionTasks.filter((t) => t.conceptId === conceptId).sort((a, b) => b.createdAt - a.createdAt)[0];

  // pick original mistake attempt for "why original answer was wrong"
  const originalMistake = useMemo(() => {
    const inc = state.attempts.filter((a) => a.conceptId === conceptId && !a.isCorrect && a.context === 'practice').sort((a, b) => b.timestamp - a.timestamp)[0];
    return inc;
  }, [state.attempts, conceptId]);

  const targetQuestions = useMemo(() => {
    const answered = new Set(state.attempts.map((a) => a.questionId));
    return QUESTIONS.filter((q) => q.conceptId === conceptId && !answered.has(q.id)).slice(0, 3);
  }, [state.attempts, conceptId]);

  if (!concept || !learning) {
    return <EmptyState icon={AlertTriangle} title="Concept not found" body="This concept does not exist in the demo data." action={<Button onClick={onBack}>Back</Button>} />;
  }

  if (practiceActive) {
    const qs = QUESTIONS.filter((q) => q.conceptId === conceptId);
    return (
      <QuizRunner
        questions={qs}
        title={`Targeted practice — ${concept.name}`}
        subtitle="Coach practice (attempts are saved and count toward your progress)"
        contextLabel="Coach practice"
        onExit={() => setPracticeActive(false)}
        exitLabel="Back to learning page"
        onFinish={() => setPracticeActive(false)}
        onSubmitQuestion={(res) => {
          recordAttempt({ questionId: res.question.id, conceptId: res.question.conceptId, selectedOption: res.selected, correctOption: res.question.correctOption, context: 'coach_practice' });
        }}
        renderAfterEach={() => null}
      />
    );
  }

  const guidance = topError ? ERROR_TYPE_GUIDANCE[topError] : null;
  const dueNow = task?.status === 'completed' && task.reviewDueAt && task.reviewDueAt <= Date.now();

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-xs text-stone-500 hover:text-stone-800">&larr; Back to Revision Coach</button>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">{concept.topic}</div>
            <h2 className="text-xl font-semibold text-stone-900">{concept.name}</h2>
          </div>
          {task && <StatusBadge status={task.status} />}
        </div>
        {guidance && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-emerald-800"><Lightbulb size={14} /> Adaptive plan: {guidance.title}</div>
            <p className="mt-1 text-emerald-900/80">{guidance.approach}</p>
            <p className="mt-1 text-[11px] text-emerald-700/70">Based on your self-reported suspected error type. This is a starting point, not a proven diagnosis.</p>
          </div>
        )}
      </Card>

      <LearningBlock icon={BookOpen} title="1. The concept in simple language">
        <p className="text-sm leading-relaxed text-stone-700">{learning.simpleLanguage}</p>
      </LearningBlock>

      <LearningBlock icon={BookOpen} title="2. Detailed explanation">
        <p className="text-sm leading-relaxed text-stone-700">{learning.detailedExplanation}</p>
      </LearningBlock>

      <LearningBlock icon={Target} title="3. Important distinctions and common traps">
        {learning.keyDistinctions.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-stone-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Aspect</th>
                  <th className="px-3 py-2 font-medium">{learning.keyDistinctions[0].labelA}</th>
                  <th className="px-3 py-2 font-medium">{learning.keyDistinctions[0].labelB}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {learning.keyDistinctions.map((d, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-stone-700">{d.aspect}</td>
                    <td className="px-3 py-2 text-stone-700">{d.a}</td>
                    <td className="px-3 py-2 text-stone-700">{d.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ul className="mt-3 space-y-1 text-sm text-stone-700">
          {learning.commonTraps.map((t, i) => (
            <li key={i} className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" /> {t}</li>
          ))}
        </ul>
      </LearningBlock>

      <LearningBlock icon={AlertTriangle} title="4. Why your original answer was wrong">
        {originalMistake ? (
          <OriginalMistakeExplanation attempt={originalMistake} onReview={() => onStartReview(originalMistake.id)} />
        ) : (
          <p className="text-sm text-stone-600">You have no recorded incorrect answer for this concept yet. Once you do, this section will show your selected answer, the correct answer, and why each is right or wrong.</p>
        )}
      </LearningBlock>

      <LearningBlock icon={Lightbulb} title="5. Short takeaway">
        <ul className="space-y-1 text-sm text-stone-700">
          {learning.takeaways.map((t, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" /> {t}</li>)}
        </ul>
      </LearningBlock>

      <LearningBlock icon={Target} title="6. Targeted practice questions">
        <p className="mb-3 text-sm text-stone-600">Start a focused 5-question practice set for this concept. Each answer is saved and any incorrect answer is added to My Mistakes.</p>
        <Button onClick={() => onStartTargeted(conceptId)}><Play size={14} /> Start targeted practice</Button>
      </LearningBlock>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-stone-900">7. Mark revision complete</div>
            <p className="mt-1 text-xs text-stone-600">
              {task?.status === 'completed' || task?.status === 'reviewed'
                ? 'This revision task is already marked complete.'
                : 'Completing creates a follow-up retest scheduled for tomorrow. You can start it early for testing.'}
            </p>
          </div>
          <Button
            onClick={() => {
              const t = task ?? createRevisionTask(conceptId);
              if (task) completeRevisionTask(task.id);
              else if (t) completeRevisionTask(t.id);
            }}
            disabled={task?.status === 'completed' || task?.status === 'reviewed'}
          >
            <CheckCircle2 size={14} /> Mark revision complete
          </Button>
        </div>
        {(task?.status === 'completed' || task?.status === 'reviewed') && task.reviewDueAt && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm">
            <Info size={14} className="text-blue-600" />
            <span className="text-blue-900">Follow-up retest due: {new Date(task.reviewDueAt).toLocaleString()}.</span>
            <Button variant="secondary" className="text-xs" onClick={() => onStartReviewRetest(task.id, conceptId)}>
              <Play size={12} /> {dueNow ? 'Start now' : 'Start early'}
            </Button>
          </div>
        )}
      </Card>

      <Card className="bg-stone-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-stone-800">8. Next step</div>
            <p className="mt-1 text-xs text-stone-600">
              {task?.status === 'reviewed'
                ? 'You have completed a follow-up retest. Check My Progress for the comparison and consider another retest to gather more evidence.'
                : task?.status === 'completed'
                ? 'Start the follow-up retest (now or early) to test the same concept with unseen questions.'
                : 'After marking revision complete, attempt the follow-up retest scheduled for tomorrow to measure retention.'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => onNavigate('progress')}>View My Progress <ArrowRight size={14} /></Button>
        </div>
      </Card>

      <Card className="bg-stone-50">
        <p className="flex items-start gap-2 text-[11px] text-stone-500"><Info size={12} className="mt-0.5 shrink-0" /> This learning page is illustrative, original demo content. It is not sourced from external references and does not use AI.</p>
      </Card>
    </div>
  );
}

function LearningBlock({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={16} className="text-emerald-700" />
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function StatusBadge({ status }: { status: 'none' | 'pending' | 'completed' | 'reviewed' }) {
  const map = {
    none: { label: 'No revision', cls: 'bg-stone-100 text-stone-600' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800' },
    completed: { label: 'Completed — review due', cls: 'bg-blue-100 text-blue-800' },
    reviewed: { label: 'Reviewed', cls: 'bg-emerald-100 text-emerald-800' },
  }[status];
  return <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${map.cls}`}>{map.label}</span>;
}

function OriginalMistakeExplanation({ attempt, onReview }: { attempt: { id: string; questionId: string; selectedOption: number; correctOption: number }; onReview: () => void }) {
  const q = QUESTIONS.find((x) => x.id === attempt.questionId);
  const reflection = getReflectionFor(attempt.id);
  if (!q) return null;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-stone-800"><span className="font-medium">Question:</span> {q.prompt}</p>
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="font-medium text-red-700">Your answer: {String.fromCharCode(65 + attempt.selectedOption)}. {q.options[attempt.selectedOption]}</p>
        <p className="mt-1 text-red-900/80">{q.whyOthersWrong[attempt.selectedOption]}</p>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <p className="font-medium text-emerald-700">Correct answer: {String.fromCharCode(65 + q.correctOption)}. {q.options[q.correctOption]}</p>
        <p className="mt-1 text-emerald-900/80">{q.whyCorrect}</p>
      </div>
      {reflection?.errorType && (
        <p className="text-xs text-stone-500">You reported this as: <span className="font-medium">{ERROR_TYPE_LABELS[reflection.errorType]}</span></p>
      )}
      <button onClick={onReview} className="text-xs font-medium text-emerald-700 hover:text-emerald-800">Review full answer breakdown &rarr;</button>
    </div>
  );
}
