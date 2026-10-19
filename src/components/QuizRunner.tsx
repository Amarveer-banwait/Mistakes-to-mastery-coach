import { useMemo, useState } from 'react';
import { Check, X, ChevronRight, RotateCw, AlertTriangle } from 'lucide-react';
import type { Question } from '../types';
import { Button } from './AppShell';

interface Props {
  questions: Question[];
  title: string;
  subtitle?: string;
  contextLabel: string;
  onFinish: (results: { question: Question; selected: number; correct: boolean }[]) => void;
  onSubmitQuestion?: (result: { question: Question; selected: number; correct: boolean; attemptIndex: number }) => void;
  renderAfterEach?: (result: { question: Question; selected: number; correct: boolean }, index: number) => React.ReactNode;
  onExit?: () => void;
  exitLabel?: string;
}

export function QuizRunner({ questions, title, subtitle, contextLabel, onFinish, onSubmitQuestion, renderAfterEach, onExit, exitLabel }: Props) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{ question: Question; selected: number; correct: boolean }[]>([]);

  const q = questions[idx];
  const isLast = idx === questions.length - 1;

  const correctCount = useMemo(() => results.filter((r) => r.correct).length, [results]);

  if (!q) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
        <AlertTriangle className="mx-auto mb-2 text-amber-500" />
        <p className="text-sm text-stone-600">No questions available for this session.</p>
      </div>
    );
  }

  const submit = () => {
    if (selected === null) return;
    const correct = selected === q.correctOption;
    setSubmitted(true);
    setResults((prev) => {
      const updated = [...prev, { question: q, selected, correct }];
      return updated;
    });
    onSubmitQuestion?.({ question: q, selected, correct, attemptIndex: idx });
  };

  const next = () => {
    if (isLast) {
      onFinish([...results]);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setSubmitted(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">{contextLabel}</div>
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
        </div>
        <div className="text-right text-xs text-stone-500">
          <div>Question {idx + 1} of {questions.length}</div>
          {results.length > 0 && <div className="mt-0.5">Score so far: {correctCount}/{results.length}</div>}
        </div>
      </div>

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
        <div className="h-full bg-emerald-600 transition-all" style={{ width: `${((idx + (submitted ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-600">{q.difficulty}</span>
        </div>
        <p className="mb-4 text-base font-medium leading-relaxed text-stone-900">{q.prompt}</p>

        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctOption;
            const isSelected = i === selected;
            let cls = 'border-stone-200 hover:border-stone-300 hover:bg-stone-50';
            if (submitted) {
              if (isCorrect) cls = 'border-emerald-500 bg-emerald-50';
              else if (isSelected) cls = 'border-red-400 bg-red-50';
              else cls = 'border-stone-200 opacity-60';
            } else if (isSelected) {
              cls = 'border-emerald-500 bg-emerald-50';
            }
            return (
              <button
                key={i}
                disabled={submitted}
                onClick={() => setSelected(i)}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${cls}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-300 text-xs font-semibold text-stone-600">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 text-stone-800">{opt}</span>
                {submitted && isCorrect && <Check size={16} className="text-emerald-600" />}
                {submitted && isSelected && !isCorrect && <X size={16} className="text-red-500" />}
              </button>
            );
          })}
        </div>

        {!submitted && (
          <div className="mt-5 flex justify-end">
            <Button onClick={submit} disabled={selected === null}>Submit answer</Button>
          </div>
        )}

        {submitted && (
          <div className="mt-5 space-y-4">
            <div className={`rounded-lg p-4 ${selected === q.correctOption ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                {selected === q.correctOption ? <><Check size={16} className="text-emerald-600" /> Correct</> : <><X size={16} className="text-red-500" /> Incorrect</>}
              </div>
              <p className="text-sm text-stone-700">{q.explanation}</p>
            </div>

            {selected !== q.correctOption && (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
                <div className="mb-2 font-medium text-stone-800">Answer breakdown</div>
                <p className="mb-2 text-stone-700"><span className="font-medium text-emerald-700">Correct answer — {String.fromCharCode(65 + q.correctOption)}:</span> {q.options[q.correctOption]}</p>
                <p className="mb-2 text-stone-700">{q.whyCorrect}</p>
                <p className="mb-1 text-stone-700"><span className="font-medium text-red-600">Your answer — {String.fromCharCode(65 + selected!)}:</span> {q.options[selected!]}</p>
                <p className="mb-3 text-stone-700">{q.whyOthersWrong[selected!]}</p>
                <div className="border-t border-stone-200 pt-2">
                  <p className="font-medium text-stone-800">Why the other options are wrong:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-stone-700">
                    {q.options.map((_, i) => i !== selected && i !== q.correctOption && (
                      <li key={i}><span className="font-medium">{String.fromCharCode(65 + i)}.</span> {q.whyOthersWrong[i]}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {renderAfterEach && renderAfterEach({ question: q, selected: selected!, correct: selected === q.correctOption }, idx)}

            <div className="flex justify-between">
              {onExit && (
                <Button variant="ghost" onClick={onExit}><RotateCw size={14} /> {exitLabel ?? 'Exit'}</Button>
              )}
              <Button onClick={next}>
                {isLast ? 'Finish session' : <>Next question <ChevronRight size={14} /></>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
