import { useState } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, XCircle, BarChart3, Info, RefreshCw } from 'lucide-react';
import { CONCEPTS } from '../data';
import { useAppState } from '../store';
import { getProgressByConcept, getReflectionPatterns, getRetestComparisons } from '../selectors';
import { ERROR_TYPE_LABELS } from '../types';
import { Card, Button, EmptyState } from '../components/AppShell';
import type { SectionId } from '../components/AppShell';

interface Props {
  onNavigate: (s: SectionId) => void;
  onReset: () => void;
}

export function ProgressSection({ onNavigate, onReset }: Props) {
  const state = useAppState();
  const [confirmReset, setConfirmReset] = useState(false);
  const byConcept = getProgressByConcept(state);
  const comparisons = getRetestComparisons(state);
  const reflections = getReflectionPatterns(state);

  if (state.attempts.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No progress to show yet"
        body="Answer questions in Practice to build your history. Progress, comparisons and reflection patterns will appear here."
        action={<Button onClick={() => onNavigate('practice')}>Go to Practice</Button>}
      />
    );
  }

  const totalPractice = state.attempts.filter((a) => a.context === 'practice' || a.context === 'coach_practice').length;
  const totalRetest = state.attempts.filter((a) => a.context === 'retest' || a.context === 'review').length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Practice attempts</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{totalPractice}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Retest attempts</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{totalRetest}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Retests completed</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{state.retests.filter((r) => r.completedAt).length}</div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 text-sm font-semibold text-stone-800">Correct vs incorrect by concept</div>
        <div className="space-y-3">
          {byConcept.filter((c) => c.practiceCorrect + c.practiceIncorrect + c.retestCorrect + c.retestIncorrect > 0).map((c) => {
            const pTotal = c.practiceCorrect + c.practiceIncorrect;
            const rTotal = c.retestCorrect + c.retestIncorrect;
            return (
              <div key={c.concept.id} className="rounded-lg border border-stone-100 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-stone-800">{c.concept.name}</div>
                  <div className="text-xs text-stone-500">Practice: {c.practiceCorrect}/{pTotal} · Retest: {c.retestCorrect}/{rTotal}</div>
                </div>
                <div className="mt-2 flex gap-2">
                  <SegmentBar correct={c.practiceCorrect} incorrect={c.practiceIncorrect} label="Practice" />
                  <SegmentBar correct={c.retestCorrect} incorrect={c.retestIncorrect} label="Retest" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800"><TrendingUp size={16} className="text-emerald-700" /> Original vs follow-up scores</div>
        {comparisons.length === 0 ? (
          <p className="text-sm text-stone-500">No retests completed yet. Complete a retest from My Mistakes to see the comparison here.</p>
        ) : (
          <div className="space-y-3">
            {comparisons.map((cmp) => {
              const oPct = cmp.original.total ? Math.round((cmp.original.correct / cmp.original.total) * 100) : 0;
              const fPct = cmp.followup.total ? Math.round((cmp.followup.correct / cmp.followup.total) * 100) : 0;
              const delta = fPct - oPct;
              return (
                <div key={cmp.retest.id} className="rounded-lg border border-stone-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                    <span>Concepts: {cmp.retest.conceptIds.map((id) => CONCEPTS.find((c) => c.id === id)?.name).join(', ')}</span>
                    <span>{new Date(cmp.retest.completedAt!).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <MiniStat label="Original" correct={cmp.original.correct} total={cmp.original.total} pct={oPct} color="stone" />
                    <MiniStat label="Follow-up" correct={cmp.followup.correct} total={cmp.followup.total} pct={fPct} color="emerald" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-600">
                    <span className="flex items-center gap-1">
                      {delta > 0 ? <TrendingUp size={12} className="text-emerald-600" /> : delta < 0 ? <AlertTriangle size={12} className="text-amber-500" /> : <RefreshCw size={12} className="text-stone-400" />}
                      Change: {delta > 0 ? '+' : ''}{delta} pts
                    </span>
                    <span>New questions: {cmp.newQuestions}</span>
                    <span>Repeated: {cmp.repeated}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-stone-500">Small sample sizes — read as an early signal, not proof of lasting improvement.</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold text-stone-800">Concepts: improving, unresolved, due for review</div>
        <ConceptStatusGrid />
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold text-stone-800">Reflection patterns</div>
        {reflections.total === 0 ? (
          <p className="text-sm text-stone-500">No reflections submitted yet. After incorrect answers, submit a quick reflection to see your suspected error patterns here.</p>
        ) : (
          <div className="space-y-2">
            {reflections.counts.map((r) => (
              <div key={r.type} className="flex items-center gap-3">
                <div className="w-56 text-xs text-stone-700">{ERROR_TYPE_LABELS[r.type]}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full bg-emerald-600" style={{ width: `${(r.count / reflections.total) * 100}%` }} />
                </div>
                <div className="w-12 text-right text-xs text-stone-600">{r.count} ({Math.round((r.count / reflections.total) * 100)}%)</div>
              </div>
            ))}
            <p className="mt-2 text-[11px] text-stone-500">Based on {reflections.total} reflection(s). Self-reported suspected causes, not proven diagnoses.</p>
          </div>
        )}
      </Card>

      <Card className="border-red-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-stone-900">Reset demo</div>
            <p className="mt-1 text-xs text-stone-600">Clears all attempts, reflections, revision tasks, retests and review schedules from this browser. Restores a valid empty initial state.</p>
          </div>
          {confirmReset ? (
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => { onReset(); setConfirmReset(false); }}>Yes, reset everything</Button>
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmReset(true)}>Reset demo</Button>
          )}
        </div>
      </Card>

      <Card className="bg-stone-50">
        <p className="flex items-start gap-2 text-[11px] text-stone-500"><Info size={12} className="mt-0.5 shrink-0" /> All figures are computed from your locally stored activity only. The app does not invent performance improvements or claim proven lasting learning. Always read small samples as early signals.</p>
      </Card>
    </div>
  );
}

function SegmentBar({ correct, incorrect, label }: { correct: number; incorrect: number; label: string }) {
  const total = correct + incorrect;
  if (total === 0) return <div className="flex-1 text-xs text-stone-400">{label}: no data</div>;
  return (
    <div className="flex-1">
      <div className="mb-1 text-[11px] text-stone-500">{label}</div>
      <div className="flex h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="bg-emerald-600" style={{ width: `${(correct / total) * 100}%` }} />
        <div className="bg-red-400" style={{ width: `${(incorrect / total) * 100}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, correct, total, pct, color }: { label: string; correct: number; total: number; pct: number; color: 'stone' | 'emerald' }) {
  const txt = color === 'emerald' ? 'text-emerald-700' : 'text-stone-700';
  const bar = color === 'emerald' ? 'bg-emerald-600' : 'bg-stone-400';
  return (
    <div className="rounded-md border border-stone-100 p-2">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`text-sm font-semibold ${txt}`}>{correct}/{total} ({pct}%)</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className={`h-full ${bar}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function ConceptStatusGrid() {
  const state = useAppState();
  const byConcept = getProgressByConcept(state);
  const tasks = state.revisionTasks;
  const improving: string[] = [];
  const unresolved: string[] = [];
  const dueForReview: string[] = [];
  for (const c of byConcept) {
    const retests = state.retests.filter((r) => r.conceptIds.includes(c.concept.id) && r.summary);
    const last = retests[retests.length - 1];
    const hasMistake = c.practiceIncorrect > 0 || c.retestIncorrect > 0;
    if (last && last.summary && last.summary.total > 0 && last.summary.score / last.summary.total >= 0.5) improving.push(c.concept.name);
    else if (last && last.summary && last.summary.score / last.summary.total < 0.5) unresolved.push(c.concept.name);
    else if (!last && hasMistake) unresolved.push(c.concept.name);
  }
  for (const t of tasks) {
    if (t.status === 'completed' && t.reviewDueAt && t.reviewDueAt <= Date.now()) {
      const c = CONCEPTS.find((x) => x.id === t.conceptId);
      if (c) dueForReview.push(c.name);
    }
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatusList title="Improving (early signal)" items={improving} icon={CheckCircle2} color="emerald" empty="No improving concepts yet" />
      <StatusList title="Unresolved" items={unresolved} icon={XCircle} color="red" empty="No unresolved concepts" />
      <StatusList title="Due for review now" items={dueForReview} icon={AlertTriangle} color="amber" empty="Nothing due" />
    </div>
  );
}

function StatusList({ title, items, icon: Icon, color, empty }: { title: string; items: string[]; icon: typeof CheckCircle2; color: 'emerald' | 'red' | 'amber'; empty: string }) {
  const cls = { emerald: 'text-emerald-600', red: 'text-red-500', amber: 'text-amber-500' }[color];
  return (
    <div className="rounded-lg border border-stone-100 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-stone-700"><Icon size={14} className={cls} /> {title}</div>
      {items.length === 0 ? <p className="text-xs text-stone-400">{empty}</p> : (
        <ul className="space-y-1 text-xs text-stone-700">
          {items.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
