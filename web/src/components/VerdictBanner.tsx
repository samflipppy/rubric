import type { Recommendation } from '../types';

const LABEL: Record<Recommendation, string> = {
  approve: 'Approve',
  request_changes: 'Request changes',
  needs_human: 'Needs human review',
};

const DOT: Record<Recommendation, string> = {
  approve: 'bg-approve',
  request_changes: 'bg-changes',
  needs_human: 'bg-needs-human',
};

export function VerdictBanner({
  recommendation,
  headline,
  summary,
}: {
  recommendation: Recommendation;
  headline: string;
  summary: string;
}) {
  return (
    <section
      className="flex flex-col items-center gap-4 text-center"
      aria-live="polite"
      role="status"
    >
      <span className={`inline-block h-6 w-6 rounded-full sm:h-8 sm:w-8 ${DOT[recommendation]}`} aria-hidden="true" />
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{LABEL[recommendation]}</h1>
      <p className="max-w-[36ch] text-base text-muted">{headline}</p>
      <p className="max-w-[40ch] text-sm text-muted">{summary}</p>
    </section>
  );
}
