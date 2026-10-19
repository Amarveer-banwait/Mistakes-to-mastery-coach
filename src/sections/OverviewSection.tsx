import { ArrowRight, BookOpen, Sparkles, Info } from 'lucide-react';
import { useAppState } from '../store';
import { getMistakeSummaries, getOverviewMetrics, getOverviewRecommendation } from '../selectors';
import { Card, Button, EmptyState } from '../components/AppShell';
import type { SectionId } from '../components/AppShell';

interface Props {
  onNavigate: (s: SectionId) => void;
  onStartCoach: (conceptId: string) => void;
}

export function OverviewSection({ onNavigate, onStartCoach }: Props) {
  const state = useAppState();
  const metrics = getOverviewMetrics(state);
  const rec = getOverviewRecommendation(state);
  const summaries = getMistakeSummaries(state);

  if (state.attempts.length === 0) {
    return (
      <div className="space-y-5">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 text-emerald-700" size={20} />
            <div>
              <h2 className="text-base font-semibold text-stone-900">Welcome to Mistake to Mastery</h2>
              <p className="mt-1 text-sm text-stone-700">
                This study workspace turns an incorrect answer into a structured learning loop: attempt a question, reflect on the mistake, learn the concept, practise targeted questions, then retest with unseen questions and measure improvement.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => onNavigate('practice')}><BookOpen size={16} /> Start practising</Button>
                <Button variant="secondary" onClick={() => onNavigate('progress')}>See how it works</Button>
              </div>
            </div>
          </div>
        </Card>
        <EmptyState
          icon={Info}
          title="Demo data is illustrative"
          body="All questions, explanations and learning material are original synthetic demo content labelled as illustrative. No real user history, AI inference, or external resources are used. Your progress is saved locally in this browser."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {rec && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 text-emerald-700" size={20} />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Recommended next action</div>
                <p className="mt-1 text-base font-medium text-stone-900">{rec.text}</p>
                <p className="mt-1 text-xs text-stone-600">Why: this concept appears in your mistakes and is the most useful next step to keep your learning loop moving.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onStartCoach(rec.conceptId)}>Open Revision Coach <ArrowRight size={14} /></Button>
              <Button variant="secondary" onClick={() => onNavigate('mistakes')}>See all mistakes</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label} className="p-4">
            <div className="text-2xl font-semibold text-stone-900">{m.value}</div>
            <div className="mt-1 text-xs font-medium text-stone-600">{m.label}</div>
            {m.hint && <div className="mt-0.5 text-[11px] text-stone-400">{m.hint}</div>}
          </Card>
        ))}
      </div>

      {summaries.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-stone-800">Concepts with mistakes</div>
            <Button variant="ghost" onClick={() => onNavigate('mistakes')}>View all <ArrowRight size={14} /></Button>
          </div>
          <div className="space-y-2">
            {summaries.slice(0, 4).map((s) => (
              <div key={s.conceptId} className="flex items-center justify-between rounded-lg border border-stone-100 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-stone-800">{s.concept.name}</div>
                  <div className="text-xs text-stone-500">{s.mistakeCount} mistake(s) · {s.revisionStatus}</div>
                </div>
                <Button variant="secondary" onClick={() => onStartCoach(s.conceptId)} className="text-xs">Open</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="bg-stone-50">
        <div className="flex items-start gap-2 text-xs text-stone-600">
          <Info size={14} className="mt-0.5 shrink-0 text-stone-400" />
          <p>All metrics are computed from your locally saved activity. No fabricated history or external AI is used. Small sample sizes should be read as early signals, not proof of mastery.</p>
        </div>
      </Card>
    </div>
  );
}
