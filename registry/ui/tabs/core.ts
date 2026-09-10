import { emitter } from "../../../lib/events";
import { hostAttributes, nextId, scope, type HostAttributes } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

/** One entry in the tabs prop. */
export interface TabItem {
  /** Matched by position to a panel among the host's children. */
  id: string;
  /** Text shown on the tab. */
  label: string;
}

export interface TabsProps {
  /** The tabs to show, in order. Each id is matched by position to a panel among the host's children, so a
   *  tab past the last panel has none and is disabled. */
  tabs: readonly TabItem[];
  /** The active tab's id, or null to let the component manage its own selection. */
  value: string | null;
  /** The active tab when value is null, read once at mount. */
  defaultValue: string;
  /** The tablist's accessible name. */
  label: string;
}

export interface TabsEvents {
  /** The active tab changed, from a click or from moving focus with the arrow keys, Home, or End. */
  valueChange: string;
}

export const defaults: TabsProps = {
  tabs: [
    { id: "overview", label: "Overview" },
    { id: "props", label: "Props" },
    { id: "install", label: "Install" },
  ],
  value: null,
  defaultValue: "overview",
  label: "Sections",
};

/** The scoped rules for one tablist: labels in the page's font, a hairline under the row, and a two-pixel
 *  accent rule under the active tab. No pills, no background fill. */
function rules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${s} > [role="tablist"]{display:flex;flex-wrap:wrap;gap:1.5em;margin:0;border-bottom:1px solid color-mix(in srgb, ${fg} 25%, transparent)}`,
    `${s} > [role="tablist"] > [role="tab"]{appearance:none;background:transparent;border:none;border-bottom:2px solid transparent;margin:0;padding:0.5em 0.1em;font:inherit;line-height:1.2;color:${fg};cursor:pointer}`,
    `${s} > [role="tablist"] > [role="tab"][aria-selected="true"]{border-bottom-color:${accent}}`,
    `${s} > [role="tablist"] > [role="tab"]:hover:not(:disabled){color:${accent}}`,
    `${s} > [role="tablist"] > [role="tab"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [role="tablist"] > [role="tab"]:disabled{opacity:0.45;cursor:not-allowed}`,
    `${s} > [role="tabpanel"]{margin-top:0.75em}`,
  ].join("\n");
}

/** One tab button the core owns, alongside the id it activates. */
interface TabEntry {
  id: string;
  disabled: boolean;
  button: HTMLButtonElement;
}

export const mount: Mount<TabsProps> = (host, initial = {}) => {
  let props: TabsProps = { ...defaults, ...initial };
  const emit = emitter<TabsEvents>(host);
  const uid = nextId("tabs");
  const tabId = (id: string): string => `${uid}-tab-${id}`;
  const panelId = (id: string): string => `${uid}-panel-${id}`;

  const tablist = document.createElement("div");
  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("data-pica", "");
  const sheet = scope(host);
  sheet.setRules(rules(sheet.selector));

  let entries: TabEntry[] = [];
  let previousTabs: readonly TabItem[] | null = null;
  // The uncontrolled selection. Meaningful only while props.value is null; defaultValue seeds it once.
  let internal = props.defaultValue;
  const panelAttrs = new Map<HTMLElement, HostAttributes>();

  /** The host's direct children other than the tablist: the panels, in order. */
  function panelsOf(): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const child of Array.from(host.children)) {
      if (child !== tablist && child instanceof HTMLElement) out.push(child);
    }
    return out;
  }

  /** The id to show: the requested one when it names a tab with a panel, else the first tab with one. */
  function resolveCurrent(requested: string, panelCount: number): string {
    const requestedIndex = entries.findIndex((entry) => entry.id === requested);
    if (requestedIndex !== -1 && requestedIndex < panelCount) return requested;
    const firstEnabled = entries.find((_entry, index) => index < panelCount);
    if (firstEnabled) return firstEnabled.id;
    return entries[0]?.id ?? "";
  }

  function select(id: string): void {
    const entry = entries.find((e) => e.id === id);
    if (!entry || entry.disabled) return;
    entry.button.focus();
    emit("valueChange", id);
    if (props.value === null) internal = id;
    apply();
  }

  function onKeydown(event: KeyboardEvent): void {
    const enabled = entries.filter((entry) => !entry.disabled);
    if (enabled.length === 0) return;
    const at = enabled.findIndex((entry) => entry.button === document.activeElement);
    let target: TabEntry | undefined;
    if (event.key === "ArrowRight") target = enabled[(at + 1 + enabled.length) % enabled.length];
    else if (event.key === "ArrowLeft") target = enabled[(at - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") target = enabled[0];
    else if (event.key === "End") target = enabled[enabled.length - 1];
    else return;
    event.preventDefault();
    if (target) select(target.id);
  }
  tablist.addEventListener("keydown", onKeydown);

  /** Rebuilds the tab buttons only when the tabs prop actually changed, so a plain re-render never steals
   *  focus from the button a user just moved to. */
  function rebuildIfNeeded(): void {
    if (previousTabs !== null && sameJson(props.tabs, previousTabs)) return;
    previousTabs = props.tabs;
    tablist.replaceChildren();
    entries = props.tabs.map((tab) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "tab");
      button.id = tabId(tab.id);
      button.textContent = tab.label;
      button.setAttribute("data-pica", "");
      button.addEventListener("click", () => select(tab.id));
      tablist.append(button);
      return { id: tab.id, disabled: false, button };
    });
  }

  function apply(): void {
    rebuildIfNeeded();
    const panels = panelsOf();
    const shown = resolveCurrent(props.value !== null ? props.value : internal, panels.length);
    if (props.value === null) internal = shown;
    if (props.label) tablist.setAttribute("aria-label", props.label);
    else tablist.removeAttribute("aria-label");
    entries.forEach((entry, index) => {
      entry.disabled = index >= panels.length;
      entry.button.disabled = entry.disabled;
      entry.button.setAttribute("aria-selected", entry.id === shown ? "true" : "false");
      entry.button.tabIndex = entry.id === shown ? 0 : -1;
      if (entry.disabled) entry.button.removeAttribute("aria-controls");
      else entry.button.setAttribute("aria-controls", panelId(entry.id));
    });
    panels.forEach((panel, index) => {
      let attrs = panelAttrs.get(panel);
      if (!attrs) {
        attrs = hostAttributes(panel);
        panelAttrs.set(panel, attrs);
      }
      const entry = entries[index];
      if (entry) {
        attrs.set("role", "tabpanel");
        attrs.set("id", panelId(entry.id));
        attrs.set("aria-labelledby", tabId(entry.id));
        attrs.set("hidden", entry.id === shown ? null : "");
      } else {
        attrs.set("role", null);
        attrs.set("id", null);
        attrs.set("aria-labelledby", null);
        attrs.set("hidden", "");
      }
    });
    for (const panel of Array.from(panelAttrs.keys())) {
      if (!panels.includes(panel)) panelAttrs.delete(panel);
    }
  }

  // React can replace a panel outright, for example on a key change, and the fresh node carries none of
  // the attributes the core set. Watching the child list catches that and reapplies them.
  const observer = new MutationObserver(() => apply());

  host.prepend(tablist);
  apply();
  observer.observe(host, { childList: true });
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      observer.disconnect();
      tablist.remove();
      for (const attrs of panelAttrs.values()) attrs.restore();
      panelAttrs.clear();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
