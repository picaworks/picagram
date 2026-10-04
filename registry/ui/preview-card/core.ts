import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface PreviewCardProps {
  /** The visible label of the link that opens the preview. */
  triggerLabel: string;
  /** The destination followed when the trigger is activated. */
  href: string;
  /** The preview heading. */
  title: string;
  /** A short summary of the linked destination. */
  description: string;
  /** One line of secondary reference information. */
  meta: string;
  /** Which side of the trigger the card opens toward. */
  placement: "top" | "bottom" | "start" | "end";
  /** Milliseconds of unbroken trigger hover required before the card opens. */
  delay: number;
  /** Whether the card is open. Null leaves it uncontrolled. */
  open: boolean | null;
  /** The card's state at mount, read once, when open is null. */
  defaultOpen: boolean;
}

export interface PreviewCardEvents {
  /** The card's requested open state. */
  openChange: boolean;
}

export const defaults: PreviewCardProps = {
  triggerLabel: "Component source",
  href: "#",
  title: "registry/ui/button",
  description: "A button in four looks with a braille spinner while it loads.",
  meta: "picagram.dev/components/button",
  placement: "top",
  delay: 300,
  open: null,
  defaultOpen: false,
};

/** Distance between the link and the preview card. */
const PREVIEW_GAP = "0.6em";
/** Time allowed for the pointer to cross the gap between the link and card. */
const LEAVE_GRACE_MS = 140;

/** Card placement against the link's CSS anchor. */
const PREVIEW_PLACEMENT: Readonly<Record<PreviewCardProps["placement"], string>> = {
  top: `bottom:calc(anchor(top) + ${PREVIEW_GAP});justify-self:anchor-center`,
  bottom: `top:calc(anchor(bottom) + ${PREVIEW_GAP});justify-self:anchor-center`,
  start: `right:calc(anchor(left) + ${PREVIEW_GAP});align-self:anchor-center`,
  end: `left:calc(anchor(right) + ${PREVIEW_GAP});align-self:anchor-center`,
};

/** Scoped rules for the link and its small preview document. */
function previewRules(s: string, p: PreviewCardProps, anchorName: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `${s} [data-pica="trigger"]{display:inline-block;padding:0.2em 0.1em;color:${fg};font:inherit;line-height:1.25;text-decoration-line:underline;text-decoration-thickness:1px;text-underline-offset:0.22em;anchor-name:${anchorName}}`,
    `${s} [data-pica="trigger"]:hover{color:${accent}}`,
    `${s} [data-pica="trigger"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-pica="panel"]{position:fixed;position-anchor:${anchorName};inset:auto;margin:0;box-sizing:border-box;width:max-content;max-width:min(24em,calc(100vw - 2em));padding:0.85em 1em;border:1px solid ${fg};border-inline-start:2px solid ${accent};border-radius:0;background:transparent;color:${fg};line-height:1.4;overflow-wrap:break-word}`,
    `${s} [data-pica="panel"]{${PREVIEW_PLACEMENT[p.placement]}}`,
    `${s} [data-pica="title"]{font:inherit;font-weight:600;line-height:1.25}`,
    `${s} [data-pica="description"]{margin:0.55em 0 0;font:inherit}`,
    `${s} [data-pica="meta"]{margin-top:0.8em;color:${muted};font-family:${GRID_FONT};font-size:0.72em;line-height:1.35;letter-spacing:0.04em}`,
  ].join("\n");
}

export const mount: Mount<PreviewCardProps> = (host, initial = {}) => {
  let props: PreviewCardProps = { ...defaults, ...initial };
  const emit = emitter<PreviewCardEvents>(host);
  const sheet = scope(host);
  const panelId = nextId("pica-preview");
  const anchorName = `--${nextId("pica-anchor")}`;
  const supportsAnchor = CSS.supports("anchor-name", anchorName);

  const trigger = document.createElement("a");
  trigger.setAttribute("data-pica", "trigger");
  trigger.setAttribute("aria-details", panelId);

  const panel = document.createElement("div");
  panel.setAttribute("data-pica", "panel");
  panel.setAttribute("data-state", "closed");
  panel.id = panelId;
  panel.popover = "manual";

  const title = document.createElement("div");
  title.setAttribute("data-pica", "title");
  const description = document.createElement("p");
  description.setAttribute("data-pica", "description");
  const meta = document.createElement("div");
  meta.setAttribute("data-pica", "meta");
  panel.append(title, description, meta);
  host.append(trigger, panel);

  let openState = false;
  let overTrigger = false;
  let overPanel = false;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  const desired = (): boolean => props.open ?? openState;

  function clearOpenTimer(): void {
    if (openTimer === null) return;
    clearTimeout(openTimer);
    openTimer = null;
  }

  function clearCloseTimer(): void {
    if (closeTimer === null) return;
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  /** Places the card from measured boxes where CSS anchor positioning is unavailable. */
  function positionFallback(): void {
    if (supportsAnchor) return;
    const linkBox = trigger.getBoundingClientRect();
    const cardBox = panel.getBoundingClientRect();
    const gap = 10;
    let top: number;
    let left: number;
    if (props.placement === "top") {
      top = linkBox.top - cardBox.height - gap;
      left = linkBox.left + linkBox.width / 2 - cardBox.width / 2;
    } else if (props.placement === "bottom") {
      top = linkBox.bottom + gap;
      left = linkBox.left + linkBox.width / 2 - cardBox.width / 2;
    } else if (props.placement === "start") {
      top = linkBox.top + linkBox.height / 2 - cardBox.height / 2;
      left = linkBox.left - cardBox.width - gap;
    } else {
      top = linkBox.top + linkBox.height / 2 - cardBox.height / 2;
      left = linkBox.right + gap;
    }
    const inset = 8;
    top = Math.max(inset, Math.min(top, window.innerHeight - cardBox.height - inset));
    left = Math.max(inset, Math.min(left, window.innerWidth - cardBox.width - inset));
    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
  }

  function reflect(next: boolean): void {
    if (next && !panel.matches(":popover-open")) panel.showPopover();
    if (!next && panel.matches(":popover-open")) panel.hidePopover();
    panel.setAttribute("data-state", next ? "open" : "closed");
    openState = next;
    if (next) positionFallback();
  }

  /** Reports input intent, and applies it only while the card is uncontrolled. */
  function request(next: boolean): void {
    if (next === desired()) return;
    clearOpenTimer();
    clearCloseTimer();
    emit("openChange", next);
    if (props.open === null) reflect(next);
  }

  function scheduleOpen(): void {
    clearOpenTimer();
    clearCloseTimer();
    if (desired()) return;
    const delay = Math.max(0, Math.min(1500, props.delay));
    openTimer = setTimeout(() => {
      openTimer = null;
      if (overTrigger) request(true);
    }, delay);
  }

  function scheduleClose(): void {
    clearCloseTimer();
    if (overTrigger || overPanel) return;
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (!overTrigger && !overPanel) request(false);
    }, LEAVE_GRACE_MS);
  }

  const onTriggerEnter = (): void => {
    overTrigger = true;
    scheduleOpen();
  };
  const onTriggerLeave = (): void => {
    overTrigger = false;
    clearOpenTimer();
    scheduleClose();
  };
  const onPanelEnter = (): void => {
    overPanel = true;
    clearCloseTimer();
  };
  const onPanelLeave = (): void => {
    overPanel = false;
    scheduleClose();
  };
  const onFocus = (): void => {
    clearOpenTimer();
    clearCloseTimer();
    request(true);
  };
  const onBlur = (): void => {
    clearOpenTimer();
    clearCloseTimer();
    request(false);
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !desired()) return;
    event.preventDefault();
    request(false);
    trigger.focus();
  };

  trigger.addEventListener("pointerenter", onTriggerEnter);
  trigger.addEventListener("pointerleave", onTriggerLeave);
  trigger.addEventListener("focus", onFocus);
  trigger.addEventListener("blur", onBlur);
  panel.addEventListener("pointerenter", onPanelEnter);
  panel.addEventListener("pointerleave", onPanelLeave);
  document.addEventListener("keydown", onKeydown);

  function apply(): void {
    trigger.textContent = props.triggerLabel;
    trigger.href = props.href;
    title.textContent = props.title;
    description.textContent = props.description;
    meta.textContent = props.meta;
    sheet.setRules(previewRules(sheet.selector, props, anchorName));
    if (props.open !== null) reflect(props.open);
    else if (openState) positionFallback();
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
      clearOpenTimer();
      clearCloseTimer();
      trigger.removeEventListener("pointerenter", onTriggerEnter);
      trigger.removeEventListener("pointerleave", onTriggerLeave);
      trigger.removeEventListener("focus", onFocus);
      trigger.removeEventListener("blur", onBlur);
      panel.removeEventListener("pointerenter", onPanelEnter);
      panel.removeEventListener("pointerleave", onPanelLeave);
      document.removeEventListener("keydown", onKeydown);
      if (panel.matches(":popover-open")) panel.hidePopover();
      trigger.remove();
      panel.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
