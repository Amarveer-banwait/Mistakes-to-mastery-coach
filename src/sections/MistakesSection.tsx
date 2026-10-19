import { useState } from 'react';
import { ListChecks, ChevronDown, ChevronRight, Clock, AlertCircle, CheckCircle2, ArrowRight, Play, FileSearch } from 'lucide-react';
import { useAppState } from '../store';
import { getMistakeSummaries, getQuestion, getConcept } from '../selectors';
import { ERROR_TYPE_LABELS } from '../types';
import { Card, Button, EmptyState } from '../components/AppShell';
import type { SectionId } from '../components/AppShell';
import type { Attempt } from '../types';

interface Props {
  onNavigate: (s: SectionId) => void;
  onStartCoach: (conceptId: string) => void;
  onStartReviewRetest: (taskId: string, conceptId: string) => void;
  onStartRetest: (conceptIds: string[]) => void;
  onStartTargeted: (conceptId: string, linkedMistakeAttemptId?: string) => void;
  onStartReview: (attemptId: string) => void;
}

export function MistakesSection({ onNavigate, onStartCoach, onStartReviewRetest, onStartRetest, onStartTargeted, onStartReview }: Props) {
  const state = useAppState();
  const summaries = getMistakeSummaries(state);
  const [openId, setOpenId] = useState<string | null>(null);

  if (summaries.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No mistakes recorded yet"
        body="Answer questions incorrectly in Practice and they will appear here, grouped by concept, with suspected error type and recommended next action."
        action={<Button onClick={() => onNavigate('practice')}>Go to Practice</Button>}
      />
    );
  }

  // all incorrect attempts grouped by concept id
  const incorrectByConcept = new Map<string, Attempt[]>();
  for (const a of state.attempts) {
    if (!a.isCorrect) {
      const arr = incorrectByConcept.get(a.conceptId) ?? [];
      arr.push(a);
      incorrectByConcept.set(a.conceptId, arr);
    }
  }

  // group summaries by topic
  const byTopic = new Map<string, typeof summaries>();
  for (const s of summaries) {
    const arr = byTopic.get(s.concept.topic) ?? [];
    arr.push(s);
    byTopic.set(s.concept.topic, arr);
  }

  return (
    <div className="space-y-5">
      <Card className="bg-stone-50">
        <p className="text-xs text-stone-600">
          Every incorrect answer is added here automatically, grouped by topic and concept. Expand a concept to see every individual mistake and open any one for a full review. Suspected error types are self-reported (from your reflections) and are not proven diagnoses.
        </p>
      </Card>

      {[...byTopic.entries()].map(([topic, items]) => (
        <div key={topic}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{topic}</div>
          <div className="space-y-2">
            {items.map((s) => {
              const open = openId === s.conceptId;
              const dueNow = s.revisionStatus === 'completed' && s.reviewDueAt && s.reviewDueAt <= Date.now();
              const conceptMistakes = (incorrectByConcept.get(s.conceptId) ?? []).sort((a, b) => b.timestamp - a.timestamp);
              return (
                <Card key={s.conceptId} className="p-0">
                  <button
                    onClick={() => setOpenId(open ? null : s.conceptId)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    {open ? <ChevronDown size={18} className="text-stone-400" /> : <ChevronRight size={18} className="text-stone-400" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-stone-900">{s.concept.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                        <span>{s.mistakeCount} mistake(s)</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> Last: {new Date(s.lastMistakeAt).toLocaleDateString()}</span>
                        <span>Status: <StatusBadge status={s.revisionStatus} /></span>
                        {s.hasErrorType && s.errorTypes[0] && <span>Suspected: {ERROR_TYPE_LABELS[s.errorTypes[0].type]}</span>}
                      </div>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-stone-100 p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Recommended next action</div>
                            <p className="mt-1 text-sm text-stone-800">{s.recommendedAction}</p>
                          </div>
                          {s.errorTypes.length > 0 && (
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Suspected error types</div>
                              <ul className="mt-1 space-y-1 text-sm text-stone-700">
                                {s.errorTypes.map((e) => (
                                  <li key={e.type} className="flex items-center gap-2">
                                    <AlertCircle size={12} className="text-amber-500" /> {ERROR_TYPE_LABELS[e.type]} <span className="text-stone-400">({e.count})</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {s.retestResults.length > 0 && (
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Latest retest result</div>
                              <p className="mt-1 text-sm text-stone-800">
                                {s.retestResults[s.retestResults.length - 1].score}/{s.retestResults[s.retestResults.length - 1].total}
                                <span className="ml-2 text-xs text-stone-500">Sample size: {s.retestResults[s.retestResults.length - 1].total} question(s)</span>
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => onStartCoach(s.conceptId)} className="text-xs">
                              Open Revision Coach <ArrowRight size={14} />
                            </Button>
                            <Button variant="secondary" onClick={() => onStartRetest([s.conceptId])} className="text-xs">
                              Start retest
                            </Button>
                            <Button variant="secondary" onClick={() => onStartTargeted(s.conceptId)} className="text-xs">
                              Practise this concept
                            </Button>
                            {dueNow && s.revisionTaskId && (
                              <Button variant="secondary" onClick={() => onStartReviewRetest(s.revisionTaskId!, s.conceptId)} className="text-xs">
                                <Play size={12} /> Start due review
                              </Button>
                            )}
                            {s.revisionStatus === 'completed' && !dueNow && s.reviewDueAt && (
                              <Button variant="secondary" onClick={() => s.revisionTaskId && onStartReviewRetest(s.revisionTaskId, s.conceptId)} className="text-xs">
                                <Play size={12} /> Start review early
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">All incorrect questions for this concept ({conceptMistakes.length})</div>
                        <div className="space-y-1.5">
                          {conceptMistakes.map((att) => (
                            <AttemptRow key={att.id} attempt={att} onClick={() => onStartReview(att.id)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AttemptRow({ attempt, onClick }: { attempt: Attempt; onClick: () => void }) {
  const q = getQuestion(attempt.questionId);
  const c = getConcept(attempt.conceptId);
  if (!q) return null;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-stone-100 p-3 text-left text-sm transition hover:border-stone-300 hover:bg-stone-50"
    >
      <XIcon incorrect />
      <div className="min-w-0 flex-1">
        <p className="truncate text-stone-800">{q.prompt}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
          <span>{c?.topic}</span>
          <span>{contextLabel(attempt.context)}</span>
          <span>{new Date(attempt.timestamp).toLocaleString()}</span>
          <span className="text-red-500">Incorrect</span>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-600">
        <FileSearch size={12} /> Review
      </span>
    </button>
  );
}

function XIcon({ incorrect }: { incorrect: boolean }) {
  return (
    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${incorrect ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-600'}`}>
      {incorrect ? <CheckCircle2 size={12} /> : <CheckCircle2 size={12} />}
    </span>
  );
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

function StatusBadge({ status }: { status: 'none' | 'pending' | 'completed' | 'reviewed' }) {
  const map = {
    none: { label: 'No revision', cls: 'bg-stone-100 text-stone-600' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800' },
    completed: { label: 'Completed — review due', cls: 'bg-blue-100 text-blue-800' },
    reviewed: { label: 'Reviewed', cls: 'bg-emerald-100 text-emerald-800' },
  }[status];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${map.cls}`}>{map.label}</span>;
}
