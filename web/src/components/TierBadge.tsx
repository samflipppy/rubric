import type { Tier } from '../types';

const COLOR: Record<Tier, string> = {
  intent: 'bg-intent',
  behavioral: 'bg-behavioral',
  invariant: 'bg-invariant',
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs tracking-[0.05em] text-muted">
      <span className={`inline-block h-2 w-2 rounded-full ${COLOR[tier]}`} aria-hidden="true" />
      <span className="uppercase">{tier}</span>
    </span>
  );
}
