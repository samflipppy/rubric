import type { PRSummary } from '../types';

export function matchesFilter(pr: PRSummary, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (query.length === 0) return true;
  return (
    pr.title.toLowerCase().includes(query) ||
    pr.author.toLowerCase().includes(query) ||
    String(pr.number).includes(query)
  );
}

export function filterPRs(prs: PRSummary[], query: string): PRSummary[] {
  return prs.filter((pr) => matchesFilter(pr, query));
}
