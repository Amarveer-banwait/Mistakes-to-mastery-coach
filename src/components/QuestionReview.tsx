import { CheckCircle2, XCircle, BookOpen, ArrowRight, Info } from 'lucide-react';
import { CONCEPTS, LEARNING, QUESTIONS } from '../data';
import { getReflectionFor } from '../store';
import { ERROR_TYPE_LABELS, CONFIDENCE_LABELS } from '../types';
import { Card, Button } from './AppShell';
import type { Attempt } from '../types';

interface Props {
  attempt: Attempt;
  onBack: () => void;
  onOpenCoach: (conceptId: string) => void;
}

export function QuestionReview({ attempt, onBack, onOpenCoach }: Props) {
  const q = QUESTIONS.find((x) => x.id === attempt.questionId);
  const concept = CONCEPTS.find((c) => c.id === attempt.conceptId);
  const learning = LEARNING.find((l) => l.conceptId === attempt.conceptId);
  const reflection = getReflectionFor(attempt.id);

  if (!q || !concept) {
    return (
      <Card>
        <p className="text-sm text-stone-600">This attempt references a question or concept that no longer exists in the demo data.</p>
        <div className="mt-3"><Button variant="ghost" onClick={onBack}>&larr; Back</Button></div>
      </Card>
    );
  }

  const contextLabel: Record<string, string> = {
    practice: 'Practice',
    retest: 'Retest',
    review: 'Follow-up review',
    coach_practice: 'Coach practice',
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-xs text-stone-500 hover:text-stone-800">&larr; Back</button>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">{concept.topic}</div>
            <h2 className="text-lg font-semibold text-stone-900">Question review</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
              <span>{contextLabel[attempt.context] ?? attempt.context}</span>
              <span>{new Date(attempt.timestamp).toLocaleString()}</span>
              <span>Attempt ID: {attempt.id.slice(-6)}</span>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${attempt.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
            {attempt.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {attempt.isCorrect ? 'Correct' : 'Incorrect'}
          </span>
        </div>

        <p className="mt-4 text-base font-medium leading-relaxed text-stone-900">{q.prompt}</p>

        <div className="mt-4 space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctOption;
            const isSelected = i === attempt.selectedOption;
            let cls = 'border-stone-200 text-stone-600';
            if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-stone-800';
            else if (isSelected) cls = 'border-red-300 bg-red-50 text-stone-800';
            return (
              <div key={i} className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${cls}`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {isCorrect && <span className="text-xs font-medium text-emerald-700">Correct answer</span>}
                {isSelected && !isCorrect && <span className="text-xs font-medium text-red-600">Your answer</span>}
                {isSelected && isCorrect && <span className="text-xs font-medium text-emerald-700">Your answer</span>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-2 text-sm font-semibold text-stone-900">Explanation</div>
        <p className="text-sm leading-relaxed text-stone-700">{q.explanation}</p>
      </Card>

      <Card>
        <div className="mb-2 text-sm font-semibold text-emerald-800">Why the correct answer is correct</div>
        <p className="text-sm leading-relaxed text-stone-700">{q.whyCorrect}</p>
      </Card>

      {!attempt.isCorrect && (
        <Card>
          <div className="mb-2 text-sm font-semibold text-red-700">Why your selected answer was wrong</div>
          <p className="text-sm leading-relaxed text-stone-700">{q.whyOthersWrong[attempt.selectedOption]}</p>
          <div className="mt-3 border-t border-stone-100 pt-3">
            <div className="mb-1 text-xs font-medium text-stone-500">Why the other options are wrong</div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
              {q.options.map((_, i) => i !== attempt.selectedOption && i !== q.correctOption && (
                <li key={i}><span className="font-medium">{String.fromCharCode(65 + i)}.</span> {q.whyOthersWrong[i]}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {reflection && (reflection.errorType || reflection.confidence) && (
        <Card>
          <div className="mb-2 text-sm font-semibold text-stone-900">Your reflection for this attempt</div>
          {reflection.errorType && (
            <p className="text-sm text-stone-700">Suspected error type: <span className="font-medium">{ERROR_TYPE_LABELS[reflection.errorType]}</span></p>
          )}
          {reflection.confidence && (
            <p className="text-sm text-stone-700">Confidence at the time: <span className="font-medium">{CONFIDENCE_LABELS[reflection.confidence]}</span></p>
          )}
          <p className="mt-1 text-xs text-stone-500">Recorded on {new Date(reflection.savedAt).toLocaleString()}</p>
        </Card>
      )}

      {learning && (
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-900">
            <BookOpen size={16} className="text-emerald-700" /> {concept.name} — key takeaways
          </div>
          <ul className="space-y-1.5 text-sm text-stone-700">
            {learning.takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" /> {t}</li>
            ))}
          </ul>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => onOpenCoach(concept.id)}>
              Open learning module for {concept.name} <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      )}

      <Card className="bg-stone-50">
        <p className="flex items-start gap-2 text-[11px] text-stone-500"><Info size={12} className="mt-0.5 shrink-0" /> This review is linked to a specific attempt ({attempt.id.slice(-6)}), not the latest attempt for this question. Your history is preserved.</p>
      </Card>
    </div>
  );
}
