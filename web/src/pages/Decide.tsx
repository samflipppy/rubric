import { useEffect, useMemo, useState } from 'react';
import { navigate } from '../lib/nav';
import { TierBadge } from '../components/TierBadge';
import { buildAuditTrail, flaggedConcerns } from '../lib/audit';
import type { Answer, Brief, ChatMessage, Decision, Rubric } from '../types';

interface Props {
  brief: Brief | null;
  rubric: Rubric | null;
  answers: Answer[];
  chatLog: ChatMessage[];
  decision: Decision | null;
  decisionNote: string;
  onDecide: (d: Decision) => void;
  onNoteChange: (note: string) => void;
}

const OPTIONS: Array<{ value: Decision; label: string; className: string }> = [
  { value: 'approve', label: 'Approve', className: 'border-approve text-approve hover:bg-approve/5' },
  {
    value: 'request_changes',
    label: 'Request changes',
    className: 'border-changes text-changes hover:bg-changes/5',
  },
  { value: 'unsure', label: 'Unsure', className: 'border-needs-human text-needs-human hover:bg-needs-human/5' },
];

export function Decide({
  brief,
  rubric,
  answers,
  chatLog,
  decision,
  decisionNote,
  onDecide,
  onNoteChange,
}: Props) {
  useEffect(() => {
    if (!brief || !rubric) navigate('/');
  }, [brief, rubric]);

  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const concerns = useMemo(
    () => (rubric ? flaggedConcerns(rubric, answers) : []),
    [rubric, answers],
  );

  const auditText = useMemo(() => {
    if (!brief || !rubric || !decision) return '';
    return buildAuditTrail({ brief, rubric, answers, chatLog, decision, decisionNote });
  }, [brief, rubric, answers, chatLog, decision, decisionNote]);

  if (!brief || !rubric) return null;

  async function copy() {
    if (!auditText) return;
    await navigator.clipboard.writeText(auditText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-10 px-6 pt-12 pb-40 sm:pt-16">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.05em] text-muted">Decide · 4 of 4</p>
        <h1 className="text-xl font-medium text-ink">#{brief.prNumber} {brief.prTitle}</h1>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-[0.05em] text-muted">
          Concerns raised ({concerns.length})
        </h2>
        {concerns.length === 0 ? (
          <p className="rounded-card border border-border bg-surface px-5 py-4 text-sm text-muted">
            No concerns. Every question answered "yes."
          </p>
        ) : (
          concerns.map(({ question, answer }) => {
            const isOpen = expanded === question.id;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setExpanded(isOpen ? null : question.id)}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface px-5 py-4 text-left transition hover:bg-hover"
              >
                <div className="flex items-center justify-between">
                  <TierBadge tier={question.tier} />
                  <span className="text-xs uppercase tracking-[0.05em] text-muted">
                    {answer.answer}
                  </span>
                </div>
                <p className="text-base text-ink">{question.question}</p>
                {isOpen && (
                  <p className="mt-1 text-sm text-muted">{question.rationale}</p>
                )}
              </button>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-[0.05em] text-muted">Your call</h2>
        <div className="flex flex-col gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onDecide(opt.value)}
              className={
                'h-12 rounded-btn border-2 bg-surface text-base font-medium transition active:scale-[0.99] ' +
                opt.className +
                (decision === opt.value ? ' ring-2 ring-ink ring-offset-2 ring-offset-bg' : '')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <textarea
          value={decisionNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Optional note for the audit trail…"
          rows={3}
          className="w-full rounded-btn border border-border bg-surface px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink"
        />
      </section>

      <div
        className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-6 pt-4 backdrop-blur"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-[640px] flex-col gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={!decision}
            className="h-12 w-full rounded-btn bg-ink text-base font-medium text-bg transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? 'Copied ✓' : decision ? 'Copy review to clipboard' : 'Pick a decision first'}
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
