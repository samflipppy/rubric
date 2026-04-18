import { useEffect, useMemo, useRef, useState } from 'react';
import { listPRs } from '../lib/api';
import { filterPRs } from '../lib/filter';
import { parsePRRef } from '../lib/github';
import { navigate } from '../lib/nav';
import type { PRSummary } from '../types';

const DEFAULT_OWNER = import.meta.env.VITE_DEFAULT_OWNER as string;
const DEFAULT_REPO = import.meta.env.VITE_DEFAULT_REPO as string;

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; prs: PRSummary[] }
  | { kind: 'error'; message: string };

export function Home() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    listPRs(DEFAULT_OWNER, DEFAULT_REPO)
      .then((prs) => {
        if (alive) setState({ kind: 'ok', prs });
      })
      .catch((err: Error) => {
        if (alive) {
          const message = err.message.includes('403')
            ? 'GitHub is rate limiting us. Paste a URL to continue.'
            : err.message;
          setState({ kind: 'error', message });
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      e.preventDefault();
      filterInputRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const prs = state.kind === 'ok' ? state.prs : [];
  const visible = useMemo(() => filterPRs(prs, filterQuery), [prs, filterQuery]);
  const filtering = filterQuery.trim().length > 0;

  function startReview(owner: string, repo: string, prNumber: number) {
    const params = new URLSearchParams({ owner, repo, pr: String(prNumber) });
    navigate(`/brief?${params.toString()}`);
  }

  function submitUrl() {
    const ref = parsePRRef(url);
    if (!ref) {
      setUrlError('That does not look like a GitHub PR URL.');
      return;
    }
    setUrlError(null);
    startReview(ref.owner, ref.repo, ref.number);
  }

  return (
    <main className="mx-auto max-w-[640px] px-6 pt-12 pb-16 sm:pt-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">Rubric</h1>
        <p className="text-sm text-muted">
          Review PRs by answering questions, not reading diffs.
        </p>
      </header>

      <section className="mt-10 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-[0.05em] text-muted">
            Open PRs — {DEFAULT_OWNER}/{DEFAULT_REPO}
          </h2>
          {state.kind === 'ok' && filtering && (
            <span className="text-xs text-muted">
              {visible.length} of {prs.length} matching
            </span>
          )}
        </div>

        {state.kind === 'ok' && prs.length > 0 && (
          <div className="relative">
            <input
              ref={filterInputRef}
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by title, author, or number. Press / to focus."
              className="h-11 w-full rounded-btn border border-border bg-surface px-4 pr-10 text-sm text-ink outline-none transition placeholder:text-muted focus:border-ink"
            />
            {filtering && (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-btn text-muted hover:bg-hover hover:text-ink"
              >
                ×
              </button>
            )}
          </div>
        )}

        {state.kind === 'loading' && <SkeletonRows />}

        {state.kind === 'error' && (
          <p className="rounded-card border border-border bg-surface px-5 py-4 text-sm text-muted">
            {state.message}
          </p>
        )}

        {state.kind === 'ok' && prs.length === 0 && (
          <p className="rounded-card border border-border bg-surface px-5 py-4 text-sm text-muted">
            No open PRs right now. Paste a URL below to try it out.
          </p>
        )}

        {state.kind === 'ok' && prs.length > 0 && visible.length === 0 && (
          <p className="rounded-card border border-border bg-surface px-5 py-4 text-sm text-muted">
            No PRs match "{filterQuery.trim()}".
          </p>
        )}

        {state.kind === 'ok' &&
          visible.map((pr) => (
            <button
              key={pr.number}
              type="button"
              onClick={() => startReview(DEFAULT_OWNER, DEFAULT_REPO, pr.number)}
              className="flex flex-col gap-1 rounded-card border border-border bg-surface px-5 py-4 text-left transition hover:bg-hover active:scale-[0.995]"
            >
              <span className="text-lg font-medium text-ink">
                #{pr.number} {pr.title}
              </span>
              <span className="text-xs text-muted">
                {pr.fileCount} file{pr.fileCount === 1 ? '' : 's'} · +{pr.additions} −{pr.deletions}
              </span>
              <span className="text-xs text-muted">@{pr.author}</span>
            </button>
          ))}
      </section>

      <section className="mt-12 flex flex-col gap-3">
        <h2 className="text-sm text-muted">Or paste any PR URL</h2>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (urlError) setUrlError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitUrl();
          }}
          placeholder="github.com/owner/repo/pull/123"
          className={
            'h-12 w-full rounded-btn border bg-surface px-4 text-base text-ink outline-none transition placeholder:text-muted ' +
            (urlError ? 'border-changes' : 'border-border focus:border-ink')
          }
          aria-invalid={Boolean(urlError)}
          aria-describedby={urlError ? 'url-error' : undefined}
        />
        {urlError && (
          <p id="url-error" className="text-xs text-changes">
            {urlError}
          </p>
        )}
        <button
          type="button"
          onClick={submitUrl}
          disabled={url.trim().length === 0}
          className="h-12 w-full rounded-btn bg-ink text-base font-medium text-bg transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Review this PR
        </button>
      </section>
    </main>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex h-[84px] flex-col gap-2 rounded-card border border-border bg-surface px-5 py-4"
          aria-hidden="true"
        >
          <div className="h-4 w-3/4 animate-pulse rounded-sm bg-border" />
          <div className="h-3 w-1/3 animate-pulse rounded-sm bg-border" />
          <div className="h-3 w-1/4 animate-pulse rounded-sm bg-border" />
        </div>
      ))}
    </>
  );
}
