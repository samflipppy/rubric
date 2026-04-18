import type { Tier } from '../types';

const COLOR: Record<Tier, string> = {
  intent: 'bg-intent',
  behavioral: 'bg-behavioral',
  invariant: 'bg-invariant',
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.08em] text-ink">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${COLOR[tier]}`} aria-hidden="true" />
      <span className="uppercase">{tier}</span>
    </span>
  );
}
