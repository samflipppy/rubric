import { useEffect, useRef, useState } from 'react';
import { answerPRQuestion } from '../lib/api';
import { navigate, searchParams } from '../lib/nav';
import { DiffView } from '../components/DiffView';
import type { ChatMessage } from '../types';

interface Props {
  chatLog: ChatMessage[];
  onChatUpdate: (log: ChatMessage[]) => void;
}

const STARTERS = [
  'What could break if this ships?',
  'Is there a simpler way to do this?',
  "What's the blast radius of this change?",
  'Who should I ask to sanity-check this?',
];

export function Ask({ chatLog, onChatUpdate }: Props) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog.length, sending]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    const params = searchParams();
    const owner = params.get('owner');
    const repo = params.get('repo');
    const prNumber = Number(params.get('pr'));
    if (!owner || !repo || !prNumber) {
      navigate('/');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const nextLog = [...chatLog, userMsg];
    onChatUpdate(nextLog);
    setDraft('');
    setSending(true);
    setError(null);

    try {
      const res = await answerPRQuestion({
        owner,
        repo,
        prNumber,
        messages: nextLog.map((m) => ({ role: m.role, content: m.content })),
      });
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.answer,
        codeReferences: res.codeReferences,
      };
      onChatUpdate([...nextLog, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask failed.');
    } finally {
      setSending(false);
    }
  }

  function toDecide() {
    const params = searchParams();
    navigate(`/decide?${params.toString()}`);
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[640px] flex-col px-6 pt-8 pb-4">
      <header className="flex items-center justify-between pb-4">
        <p className="text-xs uppercase tracking-[0.05em] text-muted">Ask · 3 of 4</p>
        <button
          type="button"
          onClick={toDecide}
          className="text-xs uppercase tracking-[0.05em] text-muted hover:text-ink"
        >
          Skip to decision →
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-auto pb-32" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
        {chatLog.length === 0 && (
          <div className="flex flex-col gap-6 pt-8">
            <p className="text-base text-muted">Ask anything about this PR. The answer will quote the diff.</p>
            <div className="flex flex-col gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-card border border-border bg-surface px-4 py-3 text-left text-sm text-ink transition hover:bg-hover"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatLog.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col gap-2'}>
            {m.role === 'user' ? (
              <div className="max-w-[80%] rounded-card bg-ink px-4 py-3 text-sm text-bg">{m.content}</div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="max-w-[92%] rounded-card border border-border bg-surface px-4 py-3 text-sm text-ink">
                  {m.content}
                </div>
                {m.codeReferences && m.codeReferences.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {m.codeReferences.map((ref, j) => (
                      <div key={j} className="overflow-hidden rounded-card border border-border bg-surface">
                        <DiffView code={ref} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted" aria-hidden="true" />
            Thinking…
          </div>
        )}

        {error && (
          <p className="text-sm text-changes">{error}</p>
        )}

        <div ref={endRef} />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-6 pt-3 backdrop-blur"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <form
          className="mx-auto flex max-w-[640px] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about this PR…"
            disabled={sending}
            className="h-12 flex-1 rounded-btn border border-border bg-surface px-4 text-base text-ink outline-none transition placeholder:text-muted focus:border-ink disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || draft.trim().length === 0}
            className="h-12 rounded-btn bg-ink px-5 text-base font-medium text-bg transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
