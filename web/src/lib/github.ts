export interface PRRef {
  owner: string;
  repo: string;
  number: number;
}

const URL_RE = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;
const SHORT_RE = /^([^/\s]+)\/([^#\s]+)#(\d+)$/;

export function parsePRRef(input: string): PRRef | null {
  const trimmed = input.trim();
  const m = trimmed.match(URL_RE);
  if (m) return { owner: m[1], repo: m[2], number: Number(m[3]) };
  const s = trimmed.match(SHORT_RE);
  if (s) return { owner: s[1], repo: s[2], number: Number(s[3]) };
  return null;
}
