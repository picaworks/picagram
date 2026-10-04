import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CollapsibleProps {
  /** The shown state when controlled, or null to let the component manage it. */
  open: boolean | null;
  /** The initial shown state when open is null. It is read only when the component mounts. */
  defaultOpen: boolean;
  /** The text beside the disclosure glyph. */
  label: string;
}

export interface CollapsibleEvents {
  /** The trigger requested this new shown state. */
  openChange: boolean;
}

export const defaults: CollapsibleProps = {
  open: null,
  defaultOpen: false,
  label: "Details",
};

interface PanelOriginal {
  id: string | null;
  hidden: string | null;
}

/** Scoped disclosure rules. The label follows the page while the glyph stays on the mono grid. */
function collapsibleRules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${s}{width:100%;color:${fg}}`,
    `${s}>button[data-pica]{appearance:none;width:100%;margin:0;padding:0.7em 0;background:transparent;color:${fg};border:0;border-bottom:1px solid transparent;border-radius:0;font:inherit;line-height:1.35;text-align:left;display:flex;align-items:center;gap:0.65em;cursor:pointer}`,
    `${s}>button[data-pica][aria-expanded="true"]{border-bottom-color:color-mix(in srgb, ${fg} 28%, transparent)}`,
    `${s}>button[data-pica]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s}>button[data-pica]>span:first-child{width:1em;flex:0 0 1em;color:${fg};font-family:${GRID_FONT};text-align:center}`,
    `${s}>button[data-pica][aria-expanded="true"]>span:first-child{color:${accent}}`,
    `${s}>:not([data-pica]){box-sizing:border-box;margin:0;padding:0.9em 0 0.2em}`,
  ].join("\n");
}

export const mount: Mount<CollapsibleProps> = (host, initial = {}) => {
  let props: CollapsibleProps = { ...defaults, ...initial };
  let localOpen = props.defaultOpen;
  let destroyed = false;
  const emit = emitter<CollapsibleEvents>(host);
  const sheet = scope(host);
  const trigger = document.createElement("button");
  const glyph = document.createElement("span");
  const text = document.createElement("span");
  const originals = new Map<HTMLElement, PanelOriginal>();

  trigger.setAttribute("data-pica", "");
  trigger.type = "button";
  glyph.setAttribute("data-pica", "");
  glyph.setAttribute("aria-hidden", "true");
  text.setAttribute("data-pica", "");
  trigger.append(glyph, text);
  host.prepend(trigger);
  sheet.setRules(collapsibleRules(sheet.selector));

  const shown = (): boolean => props.open === null ? localOpen : props.open;

  function restorePanel(panel: HTMLElement, original: PanelOriginal): void {
    if (original.id === null) panel.removeAttribute("id");
    else panel.setAttribute("id", original.id);
    if (original.hidden === null) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", original.hidden);
  }

  function panels(): HTMLElement[] {
    return Array.from(host.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute("data-pica"),
    );
  }

  function applyPanels(): void {
    const current = panels();
    const present = new Set(current);
    for (const [panel, original] of originals) {
      if (!present.has(panel)) {
        restorePanel(panel, original);
        originals.delete(panel);
      }
    }
    const ids: string[] = [];
    for (const panel of current) {
      if (!originals.has(panel)) {
        originals.set(panel, { id: panel.getAttribute("id"), hidden: panel.getAttribute("hidden") });
      }
      if (!panel.id) panel.id = nextId("pica-collapsible-panel");
      if (shown()) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
      ids.push(panel.id);
    }
    if (ids.length > 0) trigger.setAttribute("aria-controls", ids.join(" "));
    else trigger.removeAttribute("aria-controls");
  }

  function apply(): void {
    const open = shown();
    trigger.setAttribute("aria-expanded", String(open));
    glyph.textContent = open ? "▾" : "▸";
    text.textContent = props.label;
    applyPanels();
  }

  const observer = new MutationObserver(applyPanels);
  observer.observe(host, { childList: true });

  const onClick = (): void => {
    const next = !shown();
    if (props.open === null) {
      localOpen = next;
      apply();
    }
    emit("openChange", next);
  };
  trigger.addEventListener("click", onClick);

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      trigger.removeEventListener("click", onClick);
      trigger.remove();
      sheet.destroy();
      for (const [panel, original] of originals) restorePanel(panel, original);
      originals.clear();
      delete host.dataset.picaReady;
    },
  };
};
