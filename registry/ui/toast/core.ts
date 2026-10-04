import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ToastItem {
  /** The stable identifier reported when this toast leaves. */
  id: string;
  /** The optional short heading. */
  title?: string;
  /** The notice body. */
  message: string;
  /** Whether the leading rule uses the accent or foreground. */
  tone: "accent" | "default";
}

export interface ToastProps {
  /** The notices to show, in stack order. */
  toasts: readonly ToastItem[];
  /** Milliseconds before a notice leaves, or zero to keep it until dismissal. */
  duration: number;
  /** The viewport corner that holds the stack. */
  position: "top-start" | "top-end" | "bottom-start" | "bottom-end";
  /** The accessible name for the live region. */
  label: string;
  /** The greatest number of notices visible at once. */
  max: number;
}

export interface ToastEvents {
  /** A notice left after its timer elapsed or its close button was pressed. */
  dismiss: string;
}

export const defaults: ToastProps = {
  toasts: [],
  duration: 6000,
  position: "bottom-end",
  label: "Notifications",
  max: 3,
};

interface ToastEntry {
  readonly id: string;
  readonly el: HTMLElement;
  readonly title: HTMLElement;
  readonly message: HTMLElement;
  remaining: number;
  started: number;
  timer: ReturnType<typeof setTimeout> | null;
  hovered: boolean;
  focused: boolean;
}

function toastRules(selector: string, position: ToastProps["position"]): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const blockSide = position.startsWith("top")
    ? "top:1rem!important;bottom:auto!important"
    : "top:auto!important;bottom:1rem!important";
  const inlineSide = position.endsWith("start")
    ? "left:1rem!important;right:auto!important"
    : "left:auto!important;right:1rem!important";
  return [
    `${selector}{position:fixed!important;${blockSide};${inlineSide};z-index:100;display:flex;flex-direction:column;gap:0.5rem;width:min(24rem,calc(100vw - 2rem))!important;height:auto!important;max-height:calc(100vh - 2rem);pointer-events:none}`,
    `${selector} [data-pica-toast]{display:grid;grid-template-columns:2px minmax(0,1fr) auto;align-items:stretch;border:1px solid ${muted};border-radius:0;background:color-mix(in srgb,${fg} 6%,transparent);color:${fg};pointer-events:auto}`,
    `${selector} [data-pica-rule]{background:${fg}}`,
    `${selector} [data-pica-toast][data-tone="accent"] [data-pica-rule]{background:${accent}}`,
    `${selector} [data-pica-copy]{min-width:0;padding:0.75rem 0.25rem 0.75rem 0.75rem}`,
    `${selector} [data-pica-title]{margin:0 0 0.28rem;font-family:${GRID_FONT};font-size:0.68rem;line-height:1.2;letter-spacing:0.06em;text-transform:uppercase;color:${muted}}`,
    `${selector} [data-pica-title][hidden]{display:none}`,
    `${selector} [data-pica-message]{margin:0;font:inherit;font-size:0.875rem;line-height:1.45;color:${fg};overflow-wrap:anywhere}`,
    `${selector} [data-pica-close]{appearance:none;align-self:start;width:2rem;height:2rem;margin:0.5rem;padding:0;border:1px solid ${muted};border-radius:0;background:transparent;color:${fg};font-family:${GRID_FONT};font-size:1rem;line-height:1;cursor:pointer}`,
    `${selector} [data-pica-close]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<ToastProps> = (host, initial = {}) => {
  let props: ToastProps = { ...defaults, ...initial };
  const emit = emitter<ToastEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const entries = new Map<string, ToastEntry>();
  const dismissed = new Set<string>();
  let previousDuration = props.duration;
  let destroyed = false;

  attrs.set("role", "log");
  attrs.set("aria-live", "polite");
  attrs.set("aria-label", props.label);
  attrs.set("aria-relevant", "additions");
  attrs.set("aria-atomic", "false");

  function clearTimer(entry: ToastEntry): void {
    if (entry.timer !== null) clearTimeout(entry.timer);
    entry.timer = null;
  }

  function removeEntry(entry: ToastEntry): void {
    clearTimer(entry);
    entry.el.remove();
    entries.delete(entry.id);
  }

  function dismiss(id: string): void {
    const entry = entries.get(id);
    if (!entry) return;
    dismissed.add(id);
    removeEntry(entry);
    emit("dismiss", id);
    reconcile();
  }

  function startTimer(entry: ToastEntry): void {
    clearTimer(entry);
    if (entry.remaining <= 0 || entry.hovered || entry.focused) return;
    entry.started = Date.now();
    entry.timer = setTimeout(() => dismiss(entry.id), entry.remaining);
  }

  function pauseTimer(entry: ToastEntry): void {
    if (entry.timer === null) return;
    entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.started));
    clearTimer(entry);
  }

  function makeEntry(toast: ToastItem): ToastEntry {
    const el = document.createElement("article");
    const rule = document.createElement("span");
    const copy = document.createElement("div");
    const title = document.createElement("p");
    const message = document.createElement("p");
    const close = document.createElement("button");
    for (const node of [el, rule, copy, title, message, close]) node.setAttribute("data-pica", "");
    el.setAttribute("data-pica-toast", "");
    rule.setAttribute("data-pica-rule", "");
    rule.setAttribute("aria-hidden", "true");
    copy.setAttribute("data-pica-copy", "");
    title.setAttribute("data-pica-title", "");
    message.setAttribute("data-pica-message", "");
    close.setAttribute("data-pica-close", toast.id);
    close.type = "button";
    close.textContent = "×";
    copy.append(title, message);
    el.append(rule, copy, close);
    const entry: ToastEntry = {
      id: toast.id,
      el,
      title,
      message,
      remaining: Math.min(20000, Math.max(0, props.duration)),
      started: 0,
      timer: null,
      hovered: false,
      focused: false,
    };
    close.addEventListener("click", () => dismiss(entry.id));
    el.addEventListener("pointerenter", () => {
      entry.hovered = true;
      pauseTimer(entry);
    });
    el.addEventListener("pointerleave", () => {
      entry.hovered = false;
      if (!entry.focused) startTimer(entry);
    });
    el.addEventListener("focusin", () => {
      entry.focused = true;
      pauseTimer(entry);
    });
    el.addEventListener("focusout", (event) => {
      if (el.contains(event.relatedTarget as Node | null)) return;
      entry.focused = false;
      if (!entry.hovered) startTimer(entry);
    });
    updateEntry(entry, toast);
    return entry;
  }

  function updateEntry(entry: ToastEntry, toast: ToastItem): void {
    entry.el.setAttribute("data-tone", toast.tone);
    entry.title.textContent = toast.title ?? "";
    entry.title.hidden = !toast.title;
    entry.message.textContent = toast.message;
    const close = entry.el.querySelector<HTMLButtonElement>("[data-pica-close]");
    close?.setAttribute("aria-label", toast.title ? `Dismiss ${toast.title}` : "Dismiss notification");
  }

  function reconcile(): void {
    const supplied = new Set(props.toasts.map((toast) => toast.id));
    for (const id of dismissed) if (!supplied.has(id)) dismissed.delete(id);

    const visible: ToastItem[] = [];
    const ids = new Set<string>();
    const limit = Math.min(6, Math.max(1, Math.round(props.max)));
    for (const toast of props.toasts) {
      if (visible.length >= limit) break;
      if (!ids.has(toast.id) && !dismissed.has(toast.id)) {
        visible.push(toast);
        ids.add(toast.id);
      }
    }

    for (const entry of entries.values()) if (!ids.has(entry.id)) removeEntry(entry);
    for (const toast of visible) {
      let entry = entries.get(toast.id);
      if (!entry) {
        entry = makeEntry(toast);
        entries.set(toast.id, entry);
        host.append(entry.el);
        startTimer(entry);
      } else {
        updateEntry(entry, toast);
      }
    }
    const desired = visible.flatMap((toast) => {
      const entry = entries.get(toast.id);
      return entry ? [entry.el] : [];
    });
    const current = Array.from(host.children).filter((node) => node.hasAttribute("data-pica-toast"));
    if (desired.some((node, index) => node !== current[index])) {
      for (const node of desired) host.append(node);
    }
  }

  function apply(resetTimers: boolean): void {
    attrs.set("aria-label", props.label);
    sheet.setRules(toastRules(sheet.selector, props.position));
    reconcile();
    if (resetTimers) {
      const duration = Math.min(20000, Math.max(0, props.duration));
      for (const entry of entries.values()) {
        entry.remaining = duration;
        startTimer(entry);
      }
    }
  }

  apply(false);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      const resetTimers = props.duration !== previousDuration;
      previousDuration = props.duration;
      apply(resetTimers);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const entry of entries.values()) removeEntry(entry);
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
