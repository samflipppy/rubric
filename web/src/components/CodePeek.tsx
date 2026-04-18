import { useEffect } from 'react';

interface Props {
  open: boolean;
  code: string;
  onClose: () => void;
}

export function CodePeek({ open, code, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex h-[70dvh] flex-col rounded-t-card border-t border-border bg-surface shadow-lg sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:h-auto sm:max-h-[80dvh] sm:w-[min(640px,90vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card"
        role="dialog"
        aria-modal="true"
        aria-label="Code context"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-sm text-muted">Code context</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-btn text-muted hover:bg-hover"
            aria-label="Close code context"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <pre className="h-full overflow-auto px-5 py-4 font-mono text-[13px] leading-[1.6] text-ink">
            {code}
          </pre>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
    </>
  );
}
