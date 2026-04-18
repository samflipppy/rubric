import { useEffect, useState } from 'react';
import { listPRs } from '../lib/api';
import { parsePRRef } from '../lib/github';
import { navigate } from '../lib/nav';
import {
  favoriteStateForPRs,
  isFavorite,
  removeFavorite,
  saveFavorite,
} from '../lib/favorites';
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
  const [favoriteFlags, setFavoriteFlags] = useState<boolean[]>([]);

  useEffect(() => {
    let alive = true;
    listPRs(DEFAULT_OWNER, DEFAULT_REPO)
      .then((prs) => {
        if (alive) {
          setState({ kind: 'ok', prs });
          const refs = prs.map((p) => ({
            owner: DEFAULT_OWNER,
            repo: DEFAULT_REPO,
            prNumber: p.number,
          }));
          setFavoriteFlags(favoriteStateForPRs(refs));
        }
      })
      .catch((err: Error) => {
        if (alive) {
          const message = err.message.includes('403')
            ? `Error in listPRs: [${err.message}]`
            : err.message;
          setState({ kind: 'error', message });
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  function startReview(owner: string, repo: string, prNumber: number) {
    const params = new URLSearchParams({ owner, repo, pr: String(prNumber) });
    navigate(`/brief?${params.toString()}`);
  }

  function toggleFavorite(prNumber: number, index: number) {
    const currentlyFav = isFavorite(DEFAULT_OWNER, DEFAULT_REPO, prNumber);
    if (currentlyFav) {
      removeFavorite(DEFAULT_OWNER, DEFAULT_REPO, prNumber);
    } else {
      saveFavorite({
        owner: DEFAULT_OWNER,
        repo: DEFAULT_REPO,
        prNumber,
        favoritedAt: Date.now(),
      });
    }
    const next = [...favoriteFlags];
    next[index] = !currentlyFav;
    setFavoriteFlags(next);
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
        <h2 className="text-xs uppercase tracking-[0.05em] text-muted">
          Open PRs — {DEFAULT_OWNER}/{DEFAULT_REPO}
        </h2>

        {state.kind === 'loading' && <SkeletonRows />}

        {state.kind === 'error' && (
          <p className="rounded-card border border-border bg-surface px-5 py-4 text-sm text-muted">
            {state.message}
          </p>
        )}

        {state.kind === 'ok' && state.prs.length === 0 && (
          <p className="rounded-card border border-border bg-surface px-5 py-4 text-sm text-muted">
            No open PRs right now. Paste a URL below to try it out.
          </p>
        )}

        {state.kind === 'ok' &&
          state.prs.map((pr, i) => (
            <div
              key={pr.number}
              className="flex items-stretch gap-2 rounded-card border border-border bg-surface transition hover:bg-hover"
            >
              <button
                type="button"
                onClick={() => startReview(DEFAULT_OWNER, DEFAULT_REPO, pr.number)}
                className="flex flex-1 flex-col gap-1 px-5 py-4 text-left active:scale-[0.995]"
              >
                <span className="text-lg font-medium text-ink">
                  #{pr.number} {pr.title}
                </span>
                <span className="text-xs text-muted">
                  {pr.fileCount} file{pr.fileCount === 1 ? '' : 's'} · +{pr.additions} −{pr.deletions}
                </span>
                <span className="text-xs text-muted">@{pr.author}</span>
              </button>
              <button
                type="button"
                aria-label={favoriteFlags[i] ? 'Unfavorite' : 'Favorite'}
                onClick={() => toggleFavorite(pr.number, i)}
                className="flex w-12 items-center justify-center text-lg text-muted hover:text-ink"
              >
                {favoriteFlags[i] ? '★' : '☆'}
              </button>
            </div>
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
