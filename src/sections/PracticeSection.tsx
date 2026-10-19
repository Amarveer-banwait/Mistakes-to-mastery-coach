import { useMemo, useState } from 'react';
import { Brain, CheckCircle2, ListChecks, XCircle, FileSearch } from 'lucide-react';
import { CONCEPTS, QUESTIONS } from '../data';
import { recordAttempt, useAppState } from '../store';
import { getUnansweredQuestionCount } from '../selectors';
import { QuizRunner } from '../components/QuizRunner';
import { ReflectionForm } from '../components/ReflectionForm';
import { Button, Card, EmptyState } from '../components/AppShell';
import type { SectionId } from '../components/AppShell';

interface Props {
  onNavigate: (s: SectionId) => void;
  onStartReview: (attemptId: string) => void;
}

export function PracticeSection({ onNavigate, onStartReview }: Props) {
  const state = useAppState();
  const [active, setActive] = useState(false);
  const [filterConcept, setFilterConcept] = useState<string>('all');
  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null);

  const pool = useMemo(() => {
    const list = filterConcept === 'all' ? QUESTIONS : QUESTIONS.filter((q) => q.conceptId === filterConcept);
    return shuffle(list);
  }, [filterConcept]);

  const unansweredCount = getUnansweredQuestionCount(state);

  if (active) {
    return (
      <QuizRunner
        questions={pool}
        title="UPSC Polity practice"
        subtitle={filterConcept === 'all' ? 'Mixed concepts' : `Focused: ${CONCEPTS.find((c) => c.id === filterConcept)?.name}`}
        contextLabel="Practice"
        onExit={() => setActive(false)}
        exitLabel="Stop practice"
        onFinish={() => setActive(false)}
        onSubmitQuestion={(res) => {
          const att = recordAttempt({
            questionId: res.question.id,
            conceptId: res.question.conceptId,
            selectedOption: res.selected,
            correctOption: res.question.correctOption,
            context: 'practice',
          });
          setLastAttemptId(att.id);
        }}
        renderAfterEach={(_, idx) => {
          if (!lastAttemptId) return null;
          const att = state.attempts.find((a) => a.id === lastAttemptId);
          if (!att || att.isCorrect) return null;
          return (
            <div className="mt-3" key={`ref-${idx}-${lastAttemptId}`}>
              <ReflectionForm attemptId={att.id} />
            </div>
          );
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Start a practice session</h2>
            <p className="mt-1 text-sm text-stone-600">
              {QUESTIONS.length} original demo questions across {CONCEPTS.length} Polity concepts. Each answer is saved with explanation and (if wrong) added to your mistake list.
            </p>
            <p className="mt-1 text-xs text-stone-500">{unansweredCount} questions you haven't seen yet.</p>
          </div>
          <Button onClick={() => setActive(true)} disabled={pool.length === 0}>
            <Brain size={16} /> Start practice
          </Button>
        </div>
        <div className="mt-4 border-t border-stone-100 pt-4">
          <div className="mb-2 text-xs font-medium text-stone-600">Filter by concept</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={filterConcept === 'all'} onClick={() => setFilterConcept('all')}>All concepts</FilterChip>
            {CONCEPTS.map((c) => (
              <FilterChip key={c.id} active={filterConcept === c.id} onClick={() => setFilterConcept(c.id)}>{c.name}</FilterChip>
            ))}
          </div>
        </div>
      </Card>

      {state.attempts.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No attempts yet"
          body="Once you answer questions, your incorrect answers will appear in My Mistakes with concept-level analysis."
          action={<Button onClick={() => onNavigate('mistakes')}>Go to My Mistakes</Button>}
        />
      ) : (
        <Card>
          <div className="mb-3 text-sm font-medium text-stone-800">Recent practice activity</div>
          <div className="space-y-2">
            {[...state.attempts].reverse().slice(0, 10).map((a) => {
              const q = QUESTIONS.find((x) => x.id === a.questionId);
              const c = CONCEPTS.find((x) => x.id === a.conceptId);
              return (
                <button
                  key={a.id}
                  onClick={() => onStartReview(a.id)}
                  className="flex w-full items-start gap-3 rounded-lg border border-stone-100 p-3 text-left text-sm transition hover:border-stone-300 hover:bg-stone-50"
                >
                  {a.isCorrect ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-stone-800">{q?.prompt}</p>
                    <p className="text-xs text-stone-500">
                      {c?.name} · {contextLabel(a.context)} · {a.isCorrect ? 'Correct' : 'Incorrect'} · {new Date(a.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-600">
                    <FileSearch size={12} /> Review
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${active ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}
    >
      {children}
    </button>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function contextLabel(ctx: string): string {
  const map: Record<string, string> = {
    practice: 'Practice',
    retest: 'Retest',
    review: 'Follow-up review',
    coach_practice: 'Coach practice',
  };
  return map[ctx] ?? ctx;
}
