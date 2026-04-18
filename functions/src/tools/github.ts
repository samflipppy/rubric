import { z } from 'zod';
import { ai } from '../genkit';
import { PRSchema, PRSummarySchema, type PR, type PRSummary } from '../schemas/pr';

const GITHUB_API = 'https://api.github.com';
const MAX_PATCH_CHARS_PER_FILE = 4000;

function headers() {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Rubric-Review-Tool',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: headers() });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

interface RawPR {
  number: number;
  title: string;
  body: string | null;
  user: { login: string } | null;
  state: string;
  html_url: string;
}

interface RawFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export async function listOpenPRs(owner: string, repo: string): Promise<PRSummary[]> {
  const raw = await gh<(RawPR & { additions?: number; deletions?: number; changed_files?: number })[]>(
    `/repos/${owner}/${repo}/pulls?state=open&per_page=20`,
  );
  const summaries = await Promise.all(
    raw.map(async (pr) => {
      const files = await gh<RawFile[]>(`/repos/${owner}/${repo}/pulls/${pr.number}/files?per_page=100`);
      const additions = files.reduce((s, f) => s + f.additions, 0);
      const deletions = files.reduce((s, f) => s + f.deletions, 0);
      return PRSummarySchema.parse({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login ?? 'unknown',
        url: pr.html_url,
        fileCount: files.length,
        additions,
        deletions,
      });
    }),
  );
  return summaries;
}

export async function fetchPR(owner: string, repo: string, number: number): Promise<PR> {
  const [pr, files] = await Promise.all([
    gh<RawPR>(`/repos/${owner}/${repo}/pulls/${number}`),
    gh<RawFile[]>(`/repos/${owner}/${repo}/pulls/${number}/files?per_page=100`),
  ]);

  const normalizedFiles = files.map((f) => ({
    filename: f.filename,
    status: (['added', 'modified', 'removed', 'renamed'].includes(f.status) ? f.status : 'modified') as
      | 'added'
      | 'modified'
      | 'removed'
      | 'renamed',
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch
      ? f.patch.length > MAX_PATCH_CHARS_PER_FILE
        ? `${f.patch.slice(0, MAX_PATCH_CHARS_PER_FILE)}\n... [truncated ${f.patch.length - MAX_PATCH_CHARS_PER_FILE} chars]`
        : f.patch
      : undefined,
  }));

  return PRSchema.parse({
    number: pr.number,
    title: pr.title,
    body: pr.body,
    author: pr.user?.login ?? 'unknown',
    state: pr.state === 'closed' ? 'closed' : 'open',
    url: pr.html_url,
    files: normalizedFiles,
  });
}

export const githubFetchPRTool = ai.defineTool(
  {
    name: 'githubFetchPR',
    description: 'Fetch a GitHub PR with its metadata and file diffs. Use this as the first step when reviewing a PR.',
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      prNumber: z.number(),
    }),
    outputSchema: PRSchema,
  },
  async ({ owner, repo, prNumber }) => fetchPR(owner, repo, prNumber),
);
