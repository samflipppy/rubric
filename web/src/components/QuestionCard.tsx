import { useState } from 'react';
import type { Question } from '../types';
import { TierBadge } from './TierBadge';
import { CodePeek } from './CodePeek';

interface Props {
  question: Question;
  onAnswer: (answer: 'yes' | 'no' | 'unsure') => void;
}

export function QuestionCard({ question, onAnswer }: Props) {
  const [peek, setPeek] = useState(false);
  const hasCode = Boolean(question.codeContext);

  return (
    <section
      className="flex flex-col gap-8"
      role="group"
      aria-label={`${question.tier} question: ${question.question}`}
    >
      <div className="flex flex-col gap-5">
        <TierBadge tier={question.tier} />
        <h2 className="max-w-[28ch] text-xl font-medium text-ink">{question.question}</h2>
        <p className="max-w-[40ch] text-sm text-muted">{question.rationale}</p>
      </div>

      <div className="flex flex-col gap-3">
        {hasCode && (
          <button
            type="button"
            onClick={() => setPeek(true)}
            className="h-11 w-full rounded-btn border border-border bg-surface text-base text-ink transition active:scale-[0.98] hover:bg-hover"
          >
            Show me the code
          </button>
        )}

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

      <CodePeek open={peek} code={question.codeContext ?? ''} onClose={() => setPeek(false)} />
    </section>
  );
}
