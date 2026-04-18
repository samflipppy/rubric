export function ProgressBar({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex gap-1" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => {
        const state = i < index ? 'filled' : i === index ? 'current' : 'empty';
        return (
          <span
            key={i}
            className={
              'h-1 flex-1 rounded-sm transition-colors ' +
              (state === 'filled'
                ? 'bg-ink'
                : state === 'current'
                  ? 'bg-ink animate-pulse'
                  : 'bg-border')
            }
          />
        );
      })}
    </div>
  );
}
