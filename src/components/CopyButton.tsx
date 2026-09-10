"use client";
import { useEffect, useState } from "react";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the selection route, for pages served without a secure context.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

type State = "copy" | "copied" | "failed";

/** Copies `text` and reads "copied" for 1.5 seconds. `what` names the thing for assistive technology. */
export function CopyButton({ text, what }: { text: string | null; what: string }) {
  const [state, setState] = useState<{ label: State; n: number }>({ label: "copy", n: 0 });

  useEffect(() => {
    if (state.label === "copy") return;
    const timer = window.setTimeout(() => setState((s) => ({ ...s, label: "copy" })), 1500);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      className="btn"
      data-state={state.label}
      disabled={text === null}
      aria-label={`${state.label} ${what}`}
      onClick={() => {
        if (text === null) return;
        void copyText(text).then((ok) => setState((s) => ({ label: ok ? "copied" : "failed", n: s.n + 1 })));
      }}
    >
      {state.label}
    </button>
  );
}
