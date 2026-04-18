import { useState } from 'react';
import type { Question } from '../types';
import { TierBadge } from './TierBadge';
import { DiffView } from './DiffView';

interface Props {
  question: Question;
  onAnswer: (answer: 'yes' | 'no' | 'unsure') => void;
}

export function QuestionCard({ question, onAnswer }: Props) {
  return (
    <section
      className="flex flex-col gap-6"
      role="group"
      aria-label={`${question.tier} question: ${question.question}`}
    >
      <div className="flex flex-col gap-5">
        <TierBadge tier={question.tier} />
        <h2 className="max-w-[32ch] text-xl font-medium text-ink">{question.question}</h2>

        <CollapsibleDiff key={question.id} code={question.codeContext} />

        <p className="max-w-[44ch] text-sm text-muted">{question.rationale}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onAnswer('no')}
            className="h-12 flex-1 rounded-btn border border-ink bg-surface text-base font-medium text-ink transition active:scale-[0.98] hover:bg-hover"
          >
            No
          </button>
          <button
            type="button"
            onClick={() => onAnswer('yes')}
            className="h-12 flex-1 rounded-btn bg-ink text-base font-medium text-bg transition active:scale-[0.98] hover:opacity-90"
          >
            Yes
          </button>
        </div>

        <button
          type="button"
          onClick={() => onAnswer('unsure')}
          className="mx-auto mt-1 px-3 py-2 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Unsure
        </button>
      </div>
    </section>
  );
}

function CollapsibleDiff({ code }: { code: string }) {
  const [open, setOpen] = useState(true);
  const lineCount = code.split('\n').length;
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.05em] text-muted transition-colors hover:bg-hover"
        aria-expanded={open}
      >
        <span>Code · {lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
        <span
          aria-hidden="true"
          className={`inline-block text-base leading-none transition-transform ${open ? 'rotate-90' : ''}`}
        >
          ›
        </span>
      </button>
      {open && (
        <div className="border-t border-border">
          <DiffView code={code} />
        </div>
      )}
    </div>
  );
}
