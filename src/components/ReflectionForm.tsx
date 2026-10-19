import { useState } from 'react';
import { ERROR_TYPE_LABELS, CONFIDENCE_LABELS, type ErrorType, type Confidence } from '../types';
import { saveReflection } from '../store';
import { Button } from './AppShell';

interface Props {
  attemptId: string;
  onSaved?: () => void;
}

export function ReflectionForm({ attemptId, onSaved }: Props) {
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [saved, setSaved] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const submit = (skip = false) => {
    saveReflection({ attemptId, errorType: skip ? null : errorType, confidence: skip ? null : confidence });
    setSaved(true);
    setSkipped(skip);
    onSaved?.();
  };

  if (saved) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
        {skipped ? 'Reflection skipped (stored as unanswered).' : 'Reflection saved. Treated as a self-reported suspected error type, not a proven diagnosis.'}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 text-sm font-medium text-stone-800">Quick reflection (optional)</div>
      <p className="mb-2 text-xs text-stone-600">What do you think caused this mistake?</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {(Object.keys(ERROR_TYPE_LABELS) as ErrorType[]).map((t) => (
          <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${errorType === t ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white hover:bg-stone-50'}`}>
            <input type="radio" name={`err-${attemptId}`} checked={errorType === t} onChange={() => setErrorType(t)} className="accent-emerald-600" />
            {ERROR_TYPE_LABELS[t]}
          </label>
        ))}
      </div>

      <p className="mt-3 mb-2 text-xs text-stone-600">How confident were you before submitting?</p>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {(Object.keys(CONFIDENCE_LABELS) as Confidence[]).map((c) => (
          <label key={c} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${confidence === c ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white hover:bg-stone-50'}`}>
            <input type="radio" name={`conf-${attemptId}`} checked={confidence === c} onChange={() => setConfidence(c)} className="accent-emerald-600" />
            {CONFIDENCE_LABELS[c]}
          </label>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button onClick={() => submit(false)} className="text-xs">Save reflection</Button>
        <Button variant="ghost" onClick={() => submit(true)} className="text-xs">Skip</Button>
      </div>
      <p className="mt-2 text-[11px] text-stone-500">Your selections are self-reported and help the app adapt. You can continue without reflecting.</p>
    </div>
  );
}
