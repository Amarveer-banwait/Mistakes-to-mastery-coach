import { useMemo, useState } from 'react';
import { Play, AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { CONCEPTS } from '../data';
import { attachReviewRetest, completeRetest, createRetest, recordAttempt, useAppState } from '../store';
import { getMistakeSummaries, pickRetestQuestions } from '../selectors';
import { Card, Button, EmptyState } from '../components/AppShell';
import type { SectionId } from '../components/AppShell';
import { QuizRunner } from '../components/QuizRunner';

interface Props {
  conceptIds: string[] | null;
  sourceTaskId?: string;
  mode: 'retest' | 'review';
  onDone: () => void;
  onNavigate: (s: SectionId) => void;
}

export function RetestSection({ conceptIds, sourceTaskId, mode, onDone, onNavigate }: Props) {
  const state = useAppState();
  const [phase, setPhase] = useState<'setup' | 'active' | 'result'>('setup');
  const [retestId, setRetestId] = useState<string | null>(null);

  const concepts = useMemo(() => {
    const ids = conceptIds ?? getMistakeSummaries(state).map((s) => s.conceptId);
    return CONCEPTS.filter((c) => ids.includes(c.id));
  }, [conceptIds, state]);

  const pick = useMemo(() => pickRetestQuestions(state, concepts.map((c) => c.id), 4), [state, concepts]);

  if (concepts.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No concepts to retest"
        body="Retests use the concepts from your mistakes. Answer questions incorrectly in Practice first."
        action={<Button onClick={() => { onNavigate('practice'); onDone(); }}>Go to Practice</Button>}
      />
    );
  }

  if (phase === 'setup') {
    return (
      <div className="space-y-5">
        <button onClick={onDone} className="text-xs text-stone-500 hover:text-stone-800">&larr; Back</button>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">{mode === 'review' ? 'Delayed review retest' : 'Retest'}</div>
          <h2 className="text-lg font-semibold text-stone-900">Test the same concepts with unseen questions</h2>
          <p className="mt-1 text-sm text-stone-600">Concepts tested: {concepts.map((c) => c.name).join(', ')}</p>

          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Unseen questions available</span>
              <span className="font-semibold text-stone-900">{pick.available} / {pick.requested} requested</span>
            </div>
            {pick.insufficient && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Only {pick.available} unseen question(s) available for these concepts.</p>
                  <p className="mt-1">This prototype will run {pick.available} question(s) so you are not tested with a question you have already seen. To gather more evidence, answer more practice questions from other concepts and return later, or reset the demo to start fresh.</p>
                </div>
              </div>
            )}
            {pick.available === 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">No unseen questions remain for these concepts.</p>
                  <p className="mt-1">You have answered every question mapped to these concepts. The app will not substitute unrelated questions or repeat an old question and pretend it is new. You can reset the demo to test the loop again, or pick a different concept.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => {
                const r = createRetest({
                  type: mode,
                  conceptIds: concepts.map((c) => c.id),
                  questionIds: pick.questions.map((q) => q.id),
                  sourceTaskId,
                });
                if (sourceTaskId) attachReviewRetest(sourceTaskId, r.id);
                setRetestId(r.id);
                setPhase('active');
              }}
              disabled={pick.questions.length === 0}
            >
              <Play size={14} /> {pick.available === 0 ? 'No questions available' : `Start ${mode === 'review' ? 'review ' : ''}retest (${pick.questions.length} question${pick.questions.length > 1 ? 's' : ''})`}
            </Button>
            <Button variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'active' && retestId) {
    return (
      <QuizRunner
        questions={pick.questions}
        title={mode === 'review' ? 'Delayed review retest' : 'Retest'}
        subtitle={`Concepts: ${concepts.map((c) => c.name).join(', ')}`}
        contextLabel={mode === 'review' ? 'Review retest' : 'Retest'}
        onExit={() => { setPhase('setup'); onDone(); }}
        exitLabel="Cancel retest"
        onSubmitQuestion={(res) => {
          recordAttempt({
            questionId: res.question.id,
            conceptId: res.question.conceptId,
            selectedOption: res.selected,
            correctOption: res.question.correctOption,
            context: mode === 'review' ? 'review' : 'retest',
            retestId,
          });
        }}
        renderAfterEach={() => null}
        onFinish={(runnerResults) => {
          const total = runnerResults.length;
          const correct = runnerResults.filter((r) => r.correct).length;
          const answeredBefore = new Set(state.attempts.filter((a) => a.context === 'practice' || a.context === 'coach_practice').map((a) => a.questionId));
          const newQ = runnerResults.filter((r) => !answeredBefore.has(r.question.id)).length;
          const repeated = total - newQ;
          completeRetest(retestId, { score: correct, total, newQuestionCount: newQ, repeatedQuestionCount: repeated });
          setPhase('result');
        }}
      />
    );
  }

  // result
  const retest = state.retests.find((r) => r.id === retestId);
  if (!retest || !retest.summary) {
    return <EmptyState icon={AlertTriangle} title="Retest not found" body="Could not load the retest summary." action={<Button onClick={onDone}>Back</Button>} />;
  }
  const originalAttempts = state.attempts.filter((a) => (a.context === 'practice' || a.context === 'coach_practice') && retest.conceptIds.includes(a.conceptId));
  const originalCorrect = originalAttempts.filter((a) => a.isCorrect).length;
  const originalTotal = originalAttempts.length;
  const followCorrect = retest.summary.score;
  const followTotal = retest.summary.total;

  return (
    <div className="space-y-5">
      <button onClick={onDone} className="text-xs text-stone-500 hover:text-stone-800">&larr; Back</button>
      <Card>
        <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Retest complete</div>
        <h2 className="text-lg font-semibold text-stone-900">Comparison: original vs follow-up</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ComparisonCard label="Original practice" correct={originalCorrect} total={originalTotal} color="stone" />
          <ComparisonCard label="Follow-up retest" correct={followCorrect} total={followTotal} color="emerald" />
        </div>
        <div className="mt-4 rounded-lg bg-stone-50 p-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoRow label="Concepts tested" value={retest.conceptIds.map((id) => CONCEPTS.find((c) => c.id === id)?.name).join(', ')} />
            <InfoRow label="Questions in retest" value={String(followTotal)} />
            <InfoRow label="New (unseen) questions" value={String(retest.summary.newQuestionCount)} />
            <InfoRow label="Repeated questions" value={String(retest.summary.repeatedQuestionCount)} />
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            {followTotal} question(s) is a small sample. {followCorrect === followTotal && followTotal > 0
              ? 'A perfect score is an early positive signal — it does not prove lasting mastery. Attempt another retest later to gather more evidence.'
              : followCorrect >= followTotal / 2
              ? 'Partial improvement. Review the concept again and attempt another retest.'
              : 'Still unresolved. Revisit the concept in the Revision Coach before retesting again.'}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => onNavigate('progress')}>View full progress <ArrowRight size={14} /></Button>
          <Button variant="secondary" onClick={onDone}>Back to My Mistakes</Button>
        </div>
      </Card>
    </div>
  );
}

function ComparisonCard({ label, correct, total, color }: { label: string; correct: number; total: number; color: 'stone' | 'emerald' }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const ring = color === 'emerald' ? 'text-emerald-700' : 'text-stone-700';
  const bar = color === 'emerald' ? 'bg-emerald-600' : 'bg-stone-400';
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${ring}`}>{correct}/{total} <span className="text-sm font-normal text-stone-500">({pct}%)</span></div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-stone-500">Sample size: {total} question(s)</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-sm font-medium text-stone-800">{value}</div>
    </div>
  );
}
