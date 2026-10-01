/**
 * What a signed-out visitor was doing when we sent them to sign in (save a property or a
 * search), so it can be finished when they come back. Kept for this tab only.
 */
export type Intent =
  { kind: "favourite"; slug: string } | { kind: "search"; query: string };

const KEY = "alcom:intent";

export function rememberIntent(intent: Intent) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(intent));
  } catch {
    /* storage unavailable: the visitor just repeats the action after signing in */
  }
}

/** Returns and clears the intent if it matches; leaves other intents in place. */
export function takeIntent<K extends Intent["kind"]>(
  kind: K,
  matches: (intent: Extract<Intent, { kind: K }>) => boolean,
): Extract<Intent, { kind: K }> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const intent = raw ? (JSON.parse(raw) as Intent) : null;
    if (intent?.kind !== kind) return null;
    const typed = intent as Extract<Intent, { kind: K }>;
    if (!matches(typed)) return null;
    sessionStorage.removeItem(KEY);
    return typed;
  } catch {
    return null;
  }
}

/** /account/sign-in, coming back to the current page afterwards. */
export function signInHref(next?: string): string {
  const here =
    next ??
    (typeof window === "undefined"
      ? "/"
      : `${window.location.pathname}${window.location.search}`);
  return `/account/sign-in?next=${encodeURIComponent(here)}`;
}
