export type View = 'home' | 'brief' | 'review' | 'ask' | 'decide';

export function viewFromPath(pathname: string): View {
  if (pathname.startsWith('/brief')) return 'brief';
  if (pathname.startsWith('/review')) return 'review';
  if (pathname.startsWith('/ask')) return 'ask';
  if (pathname.startsWith('/decide')) return 'decide';
  return 'home';
}

export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function searchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}
