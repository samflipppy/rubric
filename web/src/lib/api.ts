import type { PRSummary, Rubric, Answer, Verdict } from '../types';

const BASE = import.meta.env.VITE_FUNCTIONS_URL as string;

async function callGenkit<T>(name: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${name} failed: ${res.status} ${text}`);
  }
  const body = await res.json();
  return body.result as T;
}

export async function listPRs(owner: string, repo: string): Promise<PRSummary[]> {
  const url = `${BASE}/listPRs?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`listPRs failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.prs as PRSummary[];
}

export function generateRubric(args: { owner: string; repo: string; prNumber: number }): Promise<Rubric> {
  return callGenkit<Rubric>('generateRubric', args);
}

export function scoreReview(args: { rubric: Rubric; answers: Answer[] }): Promise<Verdict> {
  return callGenkit<Verdict>('scoreReview', args);
}
