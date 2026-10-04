import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AccordionItem {
  /** The stable value reported when this panel opens or closes. */
  id: string;
  /** The text shown in the panel's header button. */
  label: string;
  /** Keeps the header visible but prevents focus and input. */
  disabled: boolean;
}

export interface AccordionProps {
  /** The headers for the host's direct child panels, in matching order. */
  items: readonly AccordionItem[];
  /** The open panel ids, or null to let the accordion manage them. */
  open: readonly string[] | null;
  /** The initially open panel ids when open is null. */
  defaultOpen: readonly string[];
  /** Allows more than one panel to remain open. */
  multiple: boolean;
}

export interface AccordionEvents {
  /** The open panel ids requested by pointer or keyboard input. */
  openChange: readonly string[];
}

export const defaults: AccordionProps = {
  items: [
    { id: "what", label: "What Picagram draws", disabled: false },
    { id: "runtime", label: "Where the runtime lives", disabled: false },
    { id: "catalog", label: "How the catalog builds", disabled: false },
  ],
  open: null,
  defaultOpen: ["what"],
  multiple: false,
};

const ACCORDION_PANEL_ATTRIBUTES = ["role", "id", "aria-labelledby", "hidden"] as const;

interface AccordionHeader {
  heading: HTMLHeadingElement;
  button: HTMLButtonElement;
  marker: HTMLSpanElement;
  panel: HTMLElement;
}

type AccordionPanelSnapshot = Readonly<Record<(typeof ACCORDION_PANEL_ATTRIBUTES)[number], string | null>>;

function accordionRules(selector: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `:where(${selector}){display:block;width:100%;max-width:52rem;margin-inline:auto;color:${fg};border-bottom:1px solid color-mix(in srgb, ${fg} 32%, transparent)}`,
    `${selector}>[data-pica-accordion-heading]{margin:0;border-top:1px solid color-mix(in srgb, ${fg} 32%, transparent)}`,
    `${selector}>[data-pica-accordion-heading]>button{appearance:none;width:100%;display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:0;padding:1rem 0.125rem;border:0;border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1.35;text-align:left;cursor:pointer}`,
    `${selector}>[data-pica-accordion-heading]>button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector}>[data-pica-accordion-heading]>button:disabled{opacity:0.45;cursor:not-allowed}`,
    `${selector}>[data-pica-accordion-heading]>button>[data-pica-accordion-marker]{flex:none;color:${fg};font-family:${GRID_FONT};font-size:1.25em;line-height:1}`,
    `${selector}>[data-pica-accordion-heading]>button[aria-expanded="true"]>[data-pica-accordion-marker]{color:${accent}}`,
    `${selector}>:not([data-pica]){padding:0.875rem 2.75rem 1.25rem 0.125rem;color:${fg};line-height:1.6}`,
    `${selector}>:not([data-pica])[hidden]{display:none}`,
    `${selector}>:not([data-pica])>:first-child{margin-top:0}`,
    `${selector}>:not([data-pica])>:last-child{margin-bottom:0}`,
  ].join("\n");
}

function accordionPanels(host: HTMLElement): HTMLElement[] {
  return Array.from(host.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute("data-pica"),
  );
}

function accordionOpenIds(values: readonly string[], items: readonly AccordionItem[], multiple: boolean): string[] {
  const available = new Set(items.map((item) => item.id));
  const result: string[] = [];
  for (const value of values) {
    if (available.has(value) && !result.includes(value)) result.push(value);
    if (!multiple && result.length === 1) break;
  }
  return result;
}

function accordionSnapshot(panel: HTMLElement): AccordionPanelSnapshot {
  return {
    role: panel.getAttribute("role"),
    id: panel.getAttribute("id"),
    "aria-labelledby": panel.getAttribute("aria-labelledby"),
    hidden: panel.getAttribute("hidden"),
  };
}

function accordionRestorePanel(panel: HTMLElement, snapshot: AccordionPanelSnapshot): void {
  for (const name of ACCORDION_PANEL_ATTRIBUTES) {
    const value = snapshot[name];
    if (value === null) panel.removeAttribute(name);
    else panel.setAttribute(name, value);
  }
}

export const mount: Mount<AccordionProps> = (host, initial = {}) => {
  let props: AccordionProps = { ...defaults, ...initial };
  let internalOpen = accordionOpenIds(props.defaultOpen, props.items, props.multiple);
  let headers: AccordionHeader[] = [];
  let destroyed = false;
  const emit = emitter<AccordionEvents>(host);
  const sheet = scope(host);
  const rootId = nextId("pica-accordion");
  const snapshots = new Map<HTMLElement, AccordionPanelSnapshot>();

  sheet.setRules(accordionRules(sheet.selector));

  function restorePanel(panel: HTMLElement): void {
    const snapshot = snapshots.get(panel);
    if (!snapshot) return;
    accordionRestorePanel(panel, snapshot);
    snapshots.delete(panel);
  }

  function removeHeaders(): void {
    for (const header of headers) header.heading.remove();
    headers = [];
  }

  function syncStructure(force = false): void {
    const panels = accordionPanels(host).slice(0, props.items.length);
    const active = new Set(panels);
    for (const panel of snapshots.keys()) {
      if (!active.has(panel)) restorePanel(panel);
    }

    const matches =
      !force &&
      headers.length === panels.length &&
      headers.every((header, index) =>
        header.panel === panels[index] &&
        header.heading.parentElement === host &&
        header.heading.nextElementSibling === panels[index],
      );
    if (matches) return;

    removeHeaders();
    headers = panels.map((panel) => {
      if (!snapshots.has(panel)) snapshots.set(panel, accordionSnapshot(panel));
      const heading = document.createElement("h3");
      const button = document.createElement("button");
      const label = document.createElement("span");
      const marker = document.createElement("span");
      heading.setAttribute("data-pica", "");
      heading.setAttribute("data-pica-accordion-heading", "");
      button.setAttribute("data-pica", "");
      button.setAttribute("data-pica-accordion-button", "");
      button.type = "button";
      label.setAttribute("data-pica", "");
      marker.setAttribute("data-pica", "");
      marker.setAttribute("data-pica-accordion-marker", "");
      marker.setAttribute("aria-hidden", "true");
      button.append(label, marker);
      heading.append(button);
      host.insertBefore(heading, panel);
      return { heading, button, marker, panel };
    });
  }

  function applyState(): void {
    const open = accordionOpenIds(props.open ?? internalOpen, props.items, props.multiple);
    headers.forEach((header, index) => {
      const item = props.items[index];
      if (!item) return;
      const panelId = `${rootId}-panel-${index + 1}`;
      const buttonId = `${rootId}-header-${index + 1}`;
      const expanded = open.includes(item.id);
      const label = header.button.firstElementChild;
      if (label) label.textContent = item.label;
      header.button.id = buttonId;
      header.button.disabled = item.disabled;
      header.button.setAttribute("aria-expanded", String(expanded));
      header.button.setAttribute("aria-controls", panelId);
      header.marker.textContent = expanded ? "−" : "+";
      header.panel.setAttribute("role", "region");
      header.panel.id = panelId;
      header.panel.setAttribute("aria-labelledby", buttonId);
      header.panel.toggleAttribute("hidden", !expanded);
    });
  }

  function refreshStructure(force = false): void {
    syncStructure(force);
    applyState();
  }

  function activate(index: number): void {
    const item = props.items[index];
    if (!item || item.disabled) return;
    const current = accordionOpenIds(props.open ?? internalOpen, props.items, props.multiple);
    const next = current.includes(item.id)
      ? current.filter((id) => id !== item.id)
      : props.multiple
        ? [...current, item.id]
        : [item.id];
    if (props.open === null) {
      internalOpen = next;
      applyState();
    }
    emit("openChange", next);
  }

  function eventHeader(event: Event): AccordionHeader | undefined {
    const target = event.target;
    if (!(target instanceof Element)) return undefined;
    const button = target.closest("button[data-pica-accordion-button]");
    return headers.find((header) => header.button === button);
  }

  const onClick = (event: MouseEvent): void => {
    const header = eventHeader(event);
    if (header) activate(headers.indexOf(header));
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const header = eventHeader(event);
    if (!header || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const enabled = headers.filter((candidate, index) => !props.items[index]?.disabled);
    if (enabled.length === 0) return;
    const current = enabled.indexOf(header);
    let target: AccordionHeader;
    if (event.key === "Home") target = enabled[0] ?? header;
    else if (event.key === "End") target = enabled[enabled.length - 1] ?? header;
    else {
      const direction = event.key === "ArrowDown" ? 1 : -1;
      target = enabled[(current + direction + enabled.length) % enabled.length] ?? header;
    }
    event.preventDefault();
    target.button.focus();
  };

  refreshStructure();
  host.addEventListener("click", onClick);
  host.addEventListener("keydown", onKeydown);
  const observer = new MutationObserver(() => {
    if (!destroyed) refreshStructure();
  });
  observer.observe(host, { childList: true });
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const previousItems = props.items;
      props = { ...props, ...next };
      internalOpen = accordionOpenIds(internalOpen, props.items, props.multiple);
      refreshStructure(!sameJson(previousItems, props.items));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      host.removeEventListener("click", onClick);
      host.removeEventListener("keydown", onKeydown);
      removeHeaders();
      for (const [panel, snapshot] of snapshots) accordionRestorePanel(panel, snapshot);
      snapshots.clear();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
