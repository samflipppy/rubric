import { useEffect, useState } from 'react';
import { navigate } from '../lib/nav';
import { VerdictBanner } from '../components/VerdictBanner';
import { TierBadge } from '../components/TierBadge';
import type { Answer, Rubric, Verdict as V } from '../types';

interface Props {
  rubric: Rubric | null;
  answers: Answer[];
  verdict: V | null;
}

export function Verdict({ rubric, answers, verdict }: Props) {
  useEffect(() => {
    if (!rubric || !verdict) navigate('/');
  }, [rubric, verdict]);

  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!rubric || !verdict) return null;

  const byId = new Map(rubric.questions.map((q) => [q.id, q]));
  const answerById = new Map(answers.map((a) => [a.questionId, a]));

  async function copy() {
    if (!verdict) return;
    await navigator.clipboard.writeText(verdict.auditTrailMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-10 px-6 pt-12 pb-36 sm:pt-16">
      <VerdictBanner
        recommendation={verdict.recommendation}
        headline={verdict.headline}
        summary={verdict.summary}
      />

      {verdict.concerns.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.05em] text-muted">Concerns</h2>
          {verdict.concerns.map((c) => {
            const q = byId.get(c.questionId);
            const a = answerById.get(c.questionId);
            const isOpen = expanded === c.questionId;
            return (
              <button
                key={c.questionId}
                type="button"
                onClick={() => setExpanded(isOpen ? null : c.questionId)}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface px-5 py-4 text-left transition hover:bg-hover"
              >
                {q && <TierBadge tier={q.tier} />}
                <p className="text-base text-ink">{c.concern}</p>
                {isOpen && q && (
                  <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                    <p className="text-sm text-muted">
                      <span className="font-medium text-ink">Question:</span> {q.question}
                    </p>
                    <p className="text-sm text-muted">
                      <span className="font-medium text-ink">Answer:</span>{' '}
                      {a ? a.answer.toUpperCase() : '—'}
                      {a?.note ? ` ("${a.note}")` : ''}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </section>
      ) : (
        <p className="text-center text-sm text-muted">No concerns raised.</p>
      )}

      <div
        className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-6 pt-4 backdrop-blur"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-[640px] flex-col gap-2">
          <button
            type="button"
            onClick={copy}
            className="h-12 w-full rounded-btn bg-ink text-base font-medium text-bg transition hover:opacity-90 active:scale-[0.99]"
          >
            {copied ? 'Copied ✓' : 'Copy review to clipboard'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-11 w-full rounded-btn border border-border bg-surface text-sm text-ink transition hover:bg-hover"
          >
            Review another PR
          </button>
        </div>
      </div>
    </main>
  );
}
