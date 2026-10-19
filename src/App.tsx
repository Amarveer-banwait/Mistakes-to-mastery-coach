import { useState } from 'react';
import { AppShell, type SectionId } from './components/AppShell';
import { OverviewSection } from './sections/OverviewSection';
import { PracticeSection } from './sections/PracticeSection';
import { MistakesSection } from './sections/MistakesSection';
import { CoachSection } from './sections/CoachSection';
import { ProgressSection } from './sections/ProgressSection';
import { RetestSection } from './sections/RetestSection';
import { TargetedPractice } from './sections/TargetedPractice';
import { QuestionReview } from './components/QuestionReview';
import { useAppState, useResetDemo } from './store';
import { getMistakeSummaries } from './selectors';

type View =
  | { kind: 'section'; section: SectionId }
  | { kind: 'retest'; conceptIds: string[] | null; mode: 'retest' | 'review'; sourceTaskId?: string }
  | { kind: 'targeted'; conceptId: string; linkedMistakeAttemptId?: string }
  | { kind: 'review'; attemptId: string; returnSection: SectionId };

export default function App() {
  const state = useAppState();
  const [view, setView] = useState<View>({ kind: 'section', section: 'overview' });
  const [coachConcept, setCoachConcept] = useState<string | null>(null);
  const doReset = useResetDemo();

  const pendingTasks = getMistakeSummaries(state).filter((s) => s.revisionStatus === 'pending').length;

  const goSection = (s: SectionId) => {
    if (s !== 'coach') setCoachConcept(null);
    setView({ kind: 'section', section: s });
  };

  const startCoach = (conceptId: string) => {
    setCoachConcept(conceptId);
    setView({ kind: 'section', section: 'coach' });
  };

  const startRetest = (conceptIds: string[]) => setView({ kind: 'retest', conceptIds, mode: 'retest' });
  const startReviewRetest = (taskId: string, conceptId: string) => setView({ kind: 'retest', conceptIds: [conceptId], mode: 'review', sourceTaskId: taskId });
  const startTargeted = (conceptId: string, linkedMistakeAttemptId?: string) => setView({ kind: 'targeted', conceptId, linkedMistakeAttemptId });

  const startReview = (attemptId: string, returnSection: SectionId = 'mistakes') =>
    setView({ kind: 'review', attemptId, returnSection });

  const handleReset = () => {
    doReset();
    setCoachConcept(null);
    setView({ kind: 'section', section: 'overview' });
  };

  const activeSection: SectionId = view.kind === 'section'
    ? view.section
    : view.kind === 'targeted'
    ? 'mistakes'
    : view.kind === 'review'
    ? view.returnSection
    : view.mode === 'review' ? 'coach' : 'mistakes';

  return (
    <AppShell active={activeSection} onNavigate={goSection} onReset={handleReset} pendingCount={pendingTasks}>
      {view.kind === 'section' && view.section === 'overview' && <OverviewSection onNavigate={goSection} onStartCoach={startCoach} />}
      {view.kind === 'section' && view.section === 'practice' && <PracticeSection onNavigate={goSection} onStartReview={(id) => startReview(id, 'practice')} />}
      {view.kind === 'section' && view.section === 'mistakes' && (
        <MistakesSection
          onNavigate={goSection}
          onStartCoach={startCoach}
          onStartReviewRetest={startReviewRetest}
          onStartRetest={startRetest}
          onStartTargeted={startTargeted}
          onStartReview={(id) => startReview(id, 'mistakes')}
        />
      )}
      {view.kind === 'section' && view.section === 'coach' && (
        <CoachSection
          selectedConceptId={coachConcept}
          onSelectConcept={setCoachConcept}
          onStartReviewRetest={startReviewRetest}
          onNavigate={goSection}
          onStartTargeted={startTargeted}
          onStartReview={(id) => startReview(id, 'coach')}
        />
      )}
      {view.kind === 'section' && view.section === 'progress' && <ProgressSection onNavigate={goSection} onReset={handleReset} />}
      {view.kind === 'retest' && (
        <RetestSection
          conceptIds={view.conceptIds}
          sourceTaskId={view.sourceTaskId}
          mode={view.mode}
          onDone={() => setView({ kind: 'section', section: 'mistakes' })}
          onNavigate={goSection}
        />
      )}
      {view.kind === 'targeted' && (
        <TargetedPractice
          conceptId={view.conceptId}
          linkedMistakeAttemptId={view.linkedMistakeAttemptId}
          onDone={() => setView({ kind: 'section', section: 'mistakes' })}
          onNavigate={goSection}
          onRetryWithNew={(cid) => setView({ kind: 'targeted', conceptId: cid })}
          onStartCoach={(cid) => startCoach(cid)}
          onStartReview={(id) => startReview(id, 'mistakes')}
        />
      )}
      {view.kind === 'review' && (
        <ReviewView
          attemptId={view.attemptId}
          onBack={() => setView({ kind: 'section', section: view.returnSection })}
          onOpenCoach={startCoach}
        />
      )}
    </AppShell>
  );
}

function ReviewView({ attemptId, onBack, onOpenCoach }: { attemptId: string; onBack: () => void; onOpenCoach: (cid: string) => void }) {
  const state = useAppState();
  const attempt = state.attempts.find((a) => a.id === attemptId);
  if (!attempt) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-xs text-stone-500 hover:text-stone-800">&larr; Back</button>
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-stone-600">This attempt could not be found. It may have been cleared by a reset.</p>
        </div>
      </div>
    );
  }
  return <QuestionReview attempt={attempt} onBack={onBack} onOpenCoach={onOpenCoach} />;
}
