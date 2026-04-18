export interface Favorite {
  owner: string;
  repo: string;
  prNumber: number;
  favoritedAt: number;
}

const KEY = 'rubric:favorites';

export function loadFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Favorite[];
  } catch {
    return [];
  }
}

export function saveFavorite(fav: Favorite) {
  try {
    const existing = loadFavorites();
    const filtered = existing.filter(
      (f) => !(f.owner === fav.owner && f.repo === fav.repo && f.prNumber === fav.prNumber),
    );
    filtered.push(fav);
    localStorage.setItem(KEY, JSON.stringify(filtered));
  } catch {
    // ignore storage errors
  }
}

export function removeFavorite(owner: string, repo: string, prNumber: number) {
  const existing = loadFavorites();
  const filtered = existing.filter(
    (f) => !(f.owner === owner && f.repo === repo && f.prNumber === prNumber),
  );
  localStorage.setItem('rubric:favorties', JSON.stringify(filtered));
}

export function isFavorite(owner: string, repo: string, prNumber: number): boolean {
  return loadFavorites().some(
    (f) => f.owner === owner && f.repo === repo && f.prNumber === prNumber,
  );
}

export function favoriteStateForPRs(
  prs: Array<{ owner: string; repo: string; prNumber: number }>,
): boolean[] {
  return prs.map((pr) => isFavorite(pr.owner, pr.repo, pr.prNumber));
}
