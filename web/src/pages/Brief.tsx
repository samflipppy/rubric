import { useEffect, useState } from 'react';
import { generateBrief } from '../lib/api';
import { navigate, searchParams } from '../lib/nav';
import { LoadingSequence } from '../components/LoadingSequence';
import type { Brief as BriefData } from '../types';

interface Props {
  brief: BriefData | null;
  onLoaded: (brief: BriefData) => void;
}

export function Brief({ brief, onLoaded }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brief) return;
    const params = searchParams();
    const owner = params.get('owner');
    const repo = params.get('repo');
    const prNumber = Number(params.get('pr'));
    if (!owner || !repo || !prNumber) {
      navigate('/');
      return;
    }
    let alive = true;
    generateBrief({ owner, repo, prNumber })
      .then((b) => {
        if (alive) onLoaded(b);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [brief, onLoaded]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-[60dvh] max-w-[640px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-[40ch] text-base text-ink">Could not load this PR.</p>
        <p className="max-w-[40ch] text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-11 rounded-btn border border-border bg-surface px-5 text-sm text-ink hover:bg-hover"
        >
          Back to home
        </button>
      </main>
    );
  }

  if (!brief) return <LoadingSequence />;

  const params = searchParams();
  const target = `/review?${params.toString()}`;

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-10 px-6 pt-12 pb-16 sm:pt-16">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="self-start text-xs uppercase tracking-[0.05em] text-muted hover:text-ink"
      >
        ← Home
      </button>

      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.05em] text-muted">Brief · 1 of 4</p>
        <h1 className="text-xl font-medium text-ink">
          <a href={brief.prUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
            #{brief.prNumber} {brief.prTitle}
          </a>
        </h1>
        <p className="text-sm text-muted">
          @{brief.prAuthor} · {brief.fileCount} file{brief.fileCount === 1 ? '' : 's'} · +{brief.additions} / −{brief.deletions}
        </p>
      </header>

      <section>
        <p className="max-w-[46ch] text-lg text-ink">{brief.summary}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-[0.05em] text-muted">Areas</h2>
        <ul className="flex flex-col gap-1">
          {brief.areas.map((a) => (
            <li key={a} className="text-base text-ink">
              · {a}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-[0.05em] text-muted">Risk</h2>
        <p className="text-base text-ink">{brief.riskSignal}</p>
      </section>

      <button
        type="button"
        onClick={() => navigate(target)}
        className="h-12 w-full rounded-btn bg-ink text-base font-medium text-bg transition hover:opacity-90 active:scale-[0.99]"
      >
        Start review
      </button>
    </main>
  );
}
