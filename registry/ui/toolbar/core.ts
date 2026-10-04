import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope, styleHost } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ToolbarItem {
  /** The value reported when this control is activated. */
  id: string;
  /** The accessible name and visible text when glyph is absent. */
  label: string;
  /** A compact monospace mark shown instead of the label. */
  glyph?: string;
  /** Prevents activation while leaving the control available to roving focus. */
  disabled?: boolean;
  /** Makes the control retain an on or off state. */
  toggle?: boolean;
  /** The initial state of a toggle control. */
  pressed?: boolean;
  /** Draws a wider dividing rule instead of a control. */
  separator?: boolean;
}

export interface ToolbarProps {
  /** The controls and dividing rules in display order. */
  items: readonly ToolbarItem[];
  /** The accessible name for the toolbar. */
  label: string;
  /** The direction of the toolbar and its arrow key navigation. */
  orientation: "horizontal" | "vertical";
}

export interface ToolbarEvents {
  /** An action control was activated. */
  press: string;
  /** A toggle control changed state. */
  toggle: { id: string; pressed: boolean };
}

export const defaults: ToolbarProps = {
  items: [
    { id: "run", label: "Run" },
    { id: "format", label: "Format" },
    { id: "lint", label: "Lint" },
    { id: "divide", label: "Tools", separator: true },
    { id: "docs", label: "Docs", toggle: true, pressed: true },
    { id: "settings", label: "Settings" },
  ],
  label: "Editor",
  orientation: "horizontal",
};

function toolbarRules(selector: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${selector}{display:inline-flex;align-items:stretch;width:max-content;max-width:100%;box-sizing:border-box;border:1px solid ${fg};border-radius:0;background:transparent;color:${fg};vertical-align:middle}`,
    `${selector}[aria-orientation="vertical"]{flex-direction:column}`,
    `${selector}>[data-pica-control]{appearance:none;box-sizing:border-box;min-block-size:2.6em;margin:0;padding:.7em .55em;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1;white-space:nowrap;cursor:pointer}`,
    `${selector}[aria-orientation="horizontal"]>[data-pica-control]+[data-pica-control]{border-inline-start:1px solid ${fg}}`,
    `${selector}[aria-orientation="vertical"]>[data-pica-control]+[data-pica-control]{border-block-start:1px solid ${fg}}`,
    `${selector}>[data-pica-control]:hover:not([aria-disabled="true"]){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector}>[data-pica-control]:focus-visible{outline:2px solid ${accent};outline-offset:2px;position:relative;z-index:1}`,
    `${selector}>[data-pica-control][aria-disabled="true"]{opacity:.45;cursor:not-allowed}`,
    `${selector}>[data-pica-control]>span{position:relative}`,
    `${selector}>[data-pica-control][data-pica-glyph]>span{font-family:${GRID_FONT}}`,
    `${selector}>[data-pica-control][aria-pressed="true"]>span::after{content:"";position:absolute;inset-inline:0;inset-block-end:-.4em;height:2px;background:${accent}}`,
    `${selector}>[data-pica-separator]{position:relative;align-self:stretch;flex:0 0 .75em;min-inline-size:.75em;min-block-size:.75em}`,
    `${selector}[aria-orientation="horizontal"]>[data-pica-separator]::after{content:"";position:absolute;inset-block:.45em;inset-inline-start:50%;border-inline-start:1px solid ${fg}}`,
    `${selector}[aria-orientation="vertical"]>[data-pica-separator]::after{content:"";position:absolute;inset-inline:.45em;inset-block-start:50%;border-block-start:1px solid ${fg}}`,
  ].join("\n");
}

export const mount: Mount<ToolbarProps> = (host, initial = {}) => {
  let props: ToolbarProps = { ...defaults, ...initial };
  const emit = emitter<ToolbarEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const restoreHostStyle = styleHost(host, { display: "inline-flex", width: "max-content", height: "auto" });
  const nodes: HTMLElement[] = [];
  const controls: HTMLButtonElement[] = [];
  const itemFor = new Map<HTMLButtonElement, ToolbarItem>();
  const pressed = new Map<string, boolean>();
  let active = 0;

  function setTabs(): void {
    if (active >= controls.length) active = Math.max(0, controls.length - 1);
    controls.forEach((control, index) => control.setAttribute("tabindex", index === active ? "0" : "-1"));
  }

  function clearNodes(): void {
    for (const node of nodes) node.remove();
    nodes.length = 0;
    controls.length = 0;
    itemFor.clear();
  }

  function renderItems(): void {
    const activeId = itemFor.get(controls[active] as HTMLButtonElement)?.id;
    clearNodes();
    pressed.clear();
    for (const item of props.items) {
      if (item.separator) {
        const divider = document.createElement("div");
        divider.setAttribute("data-pica", "");
        divider.setAttribute("data-pica-separator", "");
        divider.setAttribute("role", "separator");
        divider.setAttribute("aria-orientation", props.orientation === "horizontal" ? "vertical" : "horizontal");
        host.append(divider);
        nodes.push(divider);
        continue;
      }
      const control = document.createElement("button");
      const text = document.createElement("span");
      control.setAttribute("data-pica", "");
      control.setAttribute("data-pica-control", item.id);
      control.setAttribute("type", "button");
      control.setAttribute("aria-label", item.label);
      control.setAttribute("aria-disabled", item.disabled ? "true" : "false");
      if (item.toggle) {
        const state = item.pressed ?? false;
        pressed.set(item.id, state);
        control.setAttribute("aria-pressed", String(state));
      }
      if (item.glyph) control.setAttribute("data-pica-glyph", "");
      text.setAttribute("data-pica", "");
      text.textContent = item.glyph || item.label;
      control.append(text);
      host.append(control);
      nodes.push(control);
      controls.push(control);
      itemFor.set(control, item);
    }
    const restored = activeId ? controls.findIndex((control) => itemFor.get(control)?.id === activeId) : -1;
    active = restored >= 0 ? restored : 0;
    setTabs();
  }

  function applyHost(): void {
    attrs.set("role", "toolbar");
    attrs.set("aria-label", props.label);
    attrs.set("aria-orientation", props.orientation);
    sheet.setRules(toolbarRules(sheet.selector));
    for (const node of nodes) {
      if (node.hasAttribute("data-pica-separator")) {
        node.setAttribute("aria-orientation", props.orientation === "horizontal" ? "vertical" : "horizontal");
      }
    }
  }

  const onFocus = (event: FocusEvent): void => {
    const index = controls.indexOf(event.target as HTMLButtonElement);
    if (index >= 0) {
      active = index;
      setTabs();
    }
  };

  const onKey = (event: KeyboardEvent): void => {
    if (!controls.includes(event.target as HTMLButtonElement)) return;
    const previous = props.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const next = props.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    let target: number;
    if (event.key === previous) target = Math.max(0, active - 1);
    else if (event.key === next) target = Math.min(controls.length - 1, active + 1);
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = controls.length - 1;
    else return;
    event.preventDefault();
    if (target !== active) {
      active = target;
      setTabs();
      controls[active]?.focus();
    }
  };

  const onClick = (event: MouseEvent): void => {
    const control = (event.target as Element).closest<HTMLButtonElement>("[data-pica-control]");
    if (!control || !itemFor.has(control)) return;
    const item = itemFor.get(control);
    if (!item) return;
    active = controls.indexOf(control);
    setTabs();
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    if (item.toggle) {
      const state = !(pressed.get(item.id) ?? false);
      pressed.set(item.id, state);
      control.setAttribute("aria-pressed", String(state));
      emit("toggle", { id: item.id, pressed: state });
    } else {
      emit("press", item.id);
    }
  };

  host.addEventListener("focusin", onFocus);
  host.addEventListener("keydown", onKey);
  host.addEventListener("click", onClick);
  renderItems();
  applyHost();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (changed(before, props, ["items"])) renderItems();
      applyHost();
    },
    destroy() {
      host.removeEventListener("focusin", onFocus);
      host.removeEventListener("keydown", onKey);
      host.removeEventListener("click", onClick);
      clearNodes();
      sheet.destroy();
      attrs.restore();
      restoreHostStyle();
      delete host.dataset.picaReady;
    },
  };
};
