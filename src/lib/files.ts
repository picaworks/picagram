/** Reads the generated files next to the site (/react, /v, /c) once each and remembers them. */
import { useEffect, useState } from "react";

const cache = new Map<string, Promise<string>>();

export function fetchText(url: string): Promise<string> {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`${response.status} for ${url}`);
      return response.text();
    });
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

export interface FileState {
  text: string | null;
  error: string | null;
}

/** The text at `url`, or nothing while it loads. Pass null to load nothing. */
export function useFileText(url: string | null): FileState {
  const [state, setState] = useState<FileState & { url: string | null }>({ url: null, text: null, error: null });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetchText(url).then(
      (text) => alive && setState({ url, text, error: null }),
      (error: unknown) => alive && setState({ url, text: null, error: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      alive = false;
    };
  }, [url]);
  return state.url === url ? state : { text: null, error: null };
}
