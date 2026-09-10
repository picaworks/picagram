import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface PopoverTooltipProps {
  /** "tooltip" describes the trigger on hover and focus. "popover" toggles a panel from a click. */
  kind: "tooltip" | "popover";
  /** The text the overlay shows. */
  content: string;
  /** The trigger button's visible label. */
  triggerLabel: string;
  /** Which side of the trigger the overlay opens toward. */
  placement: "top" | "bottom" | "start" | "end";
  /** Milliseconds the pointer must hover before a tooltip shows. The popover kind ignores this. */
  delay: number;
  /** Whether the overlay is open. Null, the default, leaves it uncontrolled. */
  open: boolean | null;
  /** The overlay's state at mount, read once, when open is null. */
  defaultOpen: boolean;
}

export interface PopoverTooltipEvents {
  /** The overlay's new open state. */
  openChange: boolean;
}

export const defaults: PopoverTooltipProps = {
  kind: "tooltip",
  content: "Installs with one command and no dependencies.",
  triggerLabel: "How it installs",
  placement: "top",
  delay: 400,
  open: null,
  defaultOpen: false,
};

/** Distance between the trigger and the overlay. */
const GAP = "0.5em";

/** Where the overlay sits, against the trigger's anchor name, using the CSS anchor positioning function. */
const PLACEMENT: Readonly<Record<PopoverTooltipProps["placement"], string>> = {
  top: `bottom:calc(anchor(top) + ${GAP});justify-self:anchor-center`,
  bottom: `top:calc(anchor(bottom) + ${GAP});justify-self:anchor-center`,
  start: `right:calc(anchor(left) + ${GAP});align-self:anchor-center`,
  end: `left:calc(anchor(right) + ${GAP});align-self:anchor-center`,
};

/** The scoped rules for one instance: a hairline trigger, and an unfilled overlay anchored to it. */
function rules(s: string, p: PopoverTooltipProps, anchorName: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${s} [data-pica="trigger"]{appearance:none;margin:0;font:inherit;line-height:1.2;padding:0.45em 0.95em;border:1px solid ${fg};border-radius:0;background:transparent;color:${fg};cursor:pointer;anchor-name:${anchorName}}`,
    `${s} [data-pica="trigger"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-pica="trigger"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-pica="panel"]{position:fixed;position-anchor:${anchorName};margin:0;inset:auto;max-width:20em;padding:0.4em 0.65em;border:1px solid ${fg};border-radius:0;background:transparent;color:${fg};font-size:0.875em;line-height:1.4;white-space:pre-wrap;overflow-wrap:break-word}`,
    `${s} [data-pica="panel"]{${PLACEMENT[p.placement]}}`,
    ...(p.kind === "tooltip" ? [`${s} [data-pica="panel"]{font-family:${GRID_FONT}}`] : []),
  ].join("\n");
}

export const mount: Mount<PopoverTooltipProps> = (host, initial = {}) => {
  let props: PopoverTooltipProps = { ...defaults, ...initial };
  const emit = emitter<PopoverTooltipEvents>(host);
  const sheet = scope(host);
  const panelId = nextId("pica-overlay");
  const anchorName = `--${nextId("pica-anchor")}`;
  const supportsAnchor = CSS.supports("anchor-name", anchorName);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.setAttribute("data-pica", "trigger");

  const panel = document.createElement("div");
  panel.setAttribute("data-pica", "panel");
  panel.id = panelId;
  panel.popover = props.kind === "tooltip" ? "manual" : "auto";
  host.append(trigger, panel);

  let prevKind = props.kind;
  // The popover element's own real, current state. It starts closed, since nothing has shown it yet.
  let openState = false;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  // True while this module is the one calling showPopover or hidePopover, so the toggle listener below
  // knows to stay out of the way instead of reporting the change a second time.
  let suppressToggle = false;

  const desired = (): boolean => props.open ?? openState;

  function clearShowTimer(): void {
    if (showTimer !== null) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  }

  /** Places the overlay with getBoundingClientRect, for browsers without CSS anchor positioning. */
  function positionFallback(): void {
    if (supportsAnchor) return;
    const t = trigger.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const gap = 8;
    let top: number;
    let left: number;
    if (props.placement === "top") {
      top = t.top - p.height - gap;
      left = t.left + t.width / 2 - p.width / 2;
    } else if (props.placement === "bottom") {
      top = t.bottom + gap;
      left = t.left + t.width / 2 - p.width / 2;
    } else if (props.placement === "start") {
      top = t.top + t.height / 2 - p.height / 2;
      left = t.left - p.width - gap;
    } else {
      top = t.top + t.height / 2 - p.height / 2;
      left = t.right + gap;
    }
    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
  }

  function show(): void {
    if (!panel.matches(":popover-open")) {
      suppressToggle = true;
      panel.showPopover();
      suppressToggle = false;
    }
    positionFallback();
  }

  function hide(): void {
    if (panel.matches(":popover-open")) {
      suppressToggle = true;
      panel.hidePopover();
      suppressToggle = false;
    }
  }

  /** Makes the real overlay match `next`, and remembers it. Safe to call when it already matches. */
  function reflect(next: boolean): void {
    if (next) show();
    else hide();
    openState = next;
    if (props.kind === "popover") trigger.setAttribute("aria-expanded", String(next));
  }

  /** Input asks for a new state. Uncontrolled, this applies it. Controlled, it only reports the intent. */
  function request(next: boolean): void {
    if (next === desired()) return;
    clearShowTimer();
    emit("openChange", next);
    if (props.open === null) reflect(next);
  }

  function applyKindAttrs(): void {
    if (props.kind === "tooltip") {
      panel.setAttribute("role", "tooltip");
      trigger.setAttribute("aria-describedby", panelId);
      trigger.removeAttribute("aria-expanded");
    } else {
      panel.removeAttribute("role");
      trigger.removeAttribute("aria-describedby");
      trigger.setAttribute("aria-expanded", String(desired()));
    }
  }

  const onPointerEnter = (): void => {
    if (props.kind !== "tooltip") return;
    clearShowTimer();
    showTimer = setTimeout(() => {
      showTimer = null;
      request(true);
    }, props.delay);
  };
  const onPointerLeave = (): void => {
    clearShowTimer();
    if (props.kind === "tooltip") request(false);
  };
  const onFocus = (): void => {
    if (props.kind === "tooltip") request(true);
  };
  const onBlur = (): void => {
    clearShowTimer();
    if (props.kind === "tooltip") request(false);
  };
  const onClick = (): void => {
    if (props.kind === "popover") request(!desired());
  };
  // Catches a change this module did not make: an "auto" popover's own outside-click dismissal. A change
  // this module made is suppressed here, since request(), reflect(), and apply() already handled it.
  const onToggle = (event: ToggleEvent): void => {
    if (suppressToggle) return;
    const next = event.newState === "open";
    if (next === openState) return;
    clearShowTimer();
    openState = next;
    if (props.kind === "popover") trigger.setAttribute("aria-expanded", String(next));
    emit("openChange", next);
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !desired()) return;
    const wasPopover = props.kind === "popover";
    request(false);
    if (wasPopover) trigger.focus();
  };

  trigger.addEventListener("pointerenter", onPointerEnter);
  trigger.addEventListener("pointerleave", onPointerLeave);
  trigger.addEventListener("focus", onFocus);
  trigger.addEventListener("blur", onBlur);
  trigger.addEventListener("click", onClick);
  panel.addEventListener("toggle", onToggle);
  document.addEventListener("keydown", onKeydown);

  function apply(): void {
    trigger.textContent = props.triggerLabel;
    panel.textContent = props.content;
    sheet.setRules(rules(sheet.selector, props, anchorName));
    if (props.kind !== prevKind) {
      hide();
      panel.popover = props.kind === "tooltip" ? "manual" : "auto";
      prevKind = props.kind;
    }
    applyKindAttrs();
    if (props.open !== null) reflect(props.open);
    if (!supportsAnchor && desired()) positionFallback();
  }

  apply();
  if (props.open === null && props.defaultOpen) reflect(true);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      clearShowTimer();
      trigger.removeEventListener("pointerenter", onPointerEnter);
      trigger.removeEventListener("pointerleave", onPointerLeave);
      trigger.removeEventListener("focus", onFocus);
      trigger.removeEventListener("blur", onBlur);
      trigger.removeEventListener("click", onClick);
      panel.removeEventListener("toggle", onToggle);
      document.removeEventListener("keydown", onKeydown);
      hide();
      trigger.remove();
      panel.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
