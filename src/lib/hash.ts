/** The selected slug lives in the URL hash (#ascii-image), so a link opens on a component. */
import { useCallback, useEffect, useState } from "react";

/** A hash that is not valid percent-encoding names nothing. */
function decode(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return "";
  }
}

interface HashState {
  slug: string | null;
  /** Counts changes that came from the URL itself: the first load, back and forward, a hand-edited hash. */
  external: number;
}

export function useHashSlug(valid: ReadonlySet<string>): readonly [string | null, (slug: string | null) => void, number] {
  const [state, setState] = useState<HashState>({ slug: null, external: 0 });

  useEffect(() => {
    const read = () => {
      const raw = decode(window.location.hash.slice(1));
      const slug = valid.has(raw) ? raw : null;
      setState((s) => (s.slug === slug ? s : { slug, external: s.external + 1 }));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [valid]);

  const setSlug = useCallback((slug: string | null) => {
    setState((s) => (s.slug === slug ? s : { ...s, slug }));
    const url = slug ? `#${encodeURIComponent(slug)}` : window.location.pathname + window.location.search;
    window.history.replaceState(null, "", url);
  }, []);

  return [state.slug, setSlug, state.external] as const;
}
