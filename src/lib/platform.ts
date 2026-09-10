import { useEffect, useState } from "react";

/** The modifier key to show in hints: the command glyph on Apple platforms, Ctrl elsewhere.
 *  The server renders the glyph, and the client corrects it after hydration. */
export function useMetaKey(): string {
  const [key, setKey] = useState("⌘");
  useEffect(() => {
    if (!/Mac|iPhone|iPad|iPod/.test(navigator.userAgent)) setKey("Ctrl");
  }, []);
  return key;
}
