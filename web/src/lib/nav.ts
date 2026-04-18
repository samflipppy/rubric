export type View = 'home' | 'review' | 'verdict';

export function viewFromPath(pathname: string): View {
  if (pathname.startsWith('/review')) return 'review';
  if (pathname.startsWith('/verdict')) return 'verdict';
  return 'home';
}

export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function searchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}
