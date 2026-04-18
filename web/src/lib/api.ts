import type { PRSummary, Rubric, Brief, ChatMessage } from '../types';

const BASE = import.meta.env.VITE_FUNCTIONS_URL as string;

async function callGenkit<T>(name: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error in ${name}: [${res.status}] ${text}`);
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

export function generateBrief(args: { owner: string; repo: string; prNumber: number }): Promise<Brief> {
  return callGenkit<Brief>('generateBrief', args);
}

export function generateRubric(args: { owner: string; repo: string; prNumber: number }): Promise<Rubric> {
  return callGenkit<Rubric>('generateRubric', args);
}

export interface AskResponse {
  answer: string;
  codeReferences: string[];
}

export function answerPRQuestion(args: {
  owner: string;
  repo: string;
  prNumber: number;
  messages: Array<{ role: ChatMessage['role']; content: string }>;
}): Promise<AskResponse> {
  return callGenkit<AskResponse>('answerPRQuestion', args);
}
