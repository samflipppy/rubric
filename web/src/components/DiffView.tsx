interface Props {
  code: string;
}

type LineKind = 'add' | 'del' | 'hunk' | 'ctx';

function classify(line: string): LineKind {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'del';
  if (line.startsWith('@@')) return 'hunk';
  return 'ctx';
}

const LINE_CLASS: Record<LineKind, string> = {
  add: 'bg-approve/10 text-approve',
  del: 'bg-changes/10 text-changes',
  hunk: 'text-muted italic',
  ctx: 'text-ink',
};

export function DiffView({ code }: Props) {
  const lines = code.split('\n');
  return (
    <div className="max-h-[50dvh] overflow-auto font-mono text-[13px] leading-[1.55]">
      {lines.map((line, i) => (
        <div key={i} className={`whitespace-pre px-4 ${LINE_CLASS[classify(line)]}`}>
          {line.length === 0 ? ' ' : line}
        </div>
      ))}
    </div>
  );
}
