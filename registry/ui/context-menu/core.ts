import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { changed } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ContextMenuItem {
  /** The value reported when this item is chosen. */
  id: string;
  /** The text shown for this item. */
  label: string;
  /** The optional keyboard shortcut shown at the right edge. */
  shortcut: string;
  /** Prevents this item from receiving focus or being chosen. */
  disabled: boolean;
}

export interface ContextMenuProps {
  /** The actions shown in the menu. */
  items: readonly ContextMenuItem[];
  /** The instruction below the content. An empty string hides it. */
  hint: string;
  /** The accessible name of the menu. */
  label: string;
}

export interface ContextMenuEvents {
  /** A menu item was chosen, carrying its id. */
  select: string;
}

export const defaults: ContextMenuProps = {
  items: [
    { id: "duplicate", label: "Duplicate", shortcut: "⌘D", disabled: false },
    { id: "rename", label: "Rename", shortcut: "", disabled: false },
    { id: "archive", label: "Archive", shortcut: "⌘E", disabled: false },
    { id: "delete", label: "Delete", shortcut: "⌫", disabled: false },
  ],
  hint: "Right-click for actions",
  label: "Context actions",
};

const LONG_PRESS_MS = 500;
const VIEWPORT_GAP = 8;

function contextMenuRules(s: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `:where(${s}){box-sizing:border-box;position:relative;width:100%;height:fit-content!important;min-height:8rem!important;padding:1.25rem;border:1px solid ${muted};color:${fg};background:transparent}`,
    `${s}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-pica-context-hint]{display:block;margin-top:1.5rem;padding-top:0.7rem;border-top:1px solid ${muted};color:${muted};font-family:${GRID_FONT};font-size:0.75em;line-height:1.4;letter-spacing:0.04em;text-transform:uppercase}`,
    `${s} [data-pica-context-hint][hidden]{display:none}`,
    `${s} [data-pica-context-menu]{box-sizing:border-box;position:fixed;inset:auto;margin:0;min-width:min(15rem,calc(100vw - 16px));max-width:calc(100vw - 16px);padding:0.35rem;border:1px solid ${muted};border-radius:0;background:color-mix(in srgb, ${fg} 10%, transparent);color:${fg};font:inherit}`,
    `${s} [data-pica-context-menu]::backdrop{background:transparent}`,
    `${s} [data-pica-context-item]{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;width:100%;min-height:2.2rem;padding:0.45rem 0.6rem;cursor:default;outline:none}`,
    `${s} [data-pica-context-item][data-active]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-pica-context-item]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-pica-context-item][aria-disabled="true"]{opacity:0.45}`,
    `${s} [data-pica-context-shortcut]{margin-left:auto;color:${muted};font-family:${GRID_FONT};font-size:0.8em;white-space:nowrap}`,
  ].join("\n");
}

export const mount: Mount<ContextMenuProps> = (host, initial = {}) => {
  let props: ContextMenuProps = { ...defaults, ...initial };
  let active = -1;
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressX = 0;
  let pressY = 0;
  let destroyed = false;
  const emit = emitter<ContextMenuEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const menuId = nextId("pica-context-menu");
  const hintId = nextId("pica-context-hint");
  const menu = document.createElement("div");
  const hint = document.createElement("span");

  menu.id = menuId;
  menu.setAttribute("data-pica", "");
  menu.setAttribute("data-pica-context-menu", "");
  menu.setAttribute("popover", "manual");
  menu.setAttribute("role", "menu");
  hint.id = hintId;
  hint.setAttribute("data-pica", "");
  hint.setAttribute("data-pica-context-hint", "");
  host.append(hint, menu);

  function rows(): HTMLElement[] {
    return Array.from(menu.querySelectorAll<HTMLElement>("[data-pica-context-item]"));
  }

  function enabled(index: number): boolean {
    return props.items[index]?.disabled === false;
  }

  function setActive(index: number, focus: boolean): void {
    const all = rows();
    active = enabled(index) ? index : -1;
    for (let i = 0; i < all.length; i++) all[i]?.toggleAttribute("data-active", i === active);
    if (focus && active >= 0) all[active]?.focus({ preventScroll: true });
  }

  function findEnabled(from: number, direction: 1 | -1): number {
    const count = props.items.length;
    for (let step = 1; step <= count; step++) {
      const index = (from + direction * step + count) % count;
      if (enabled(index)) return index;
    }
    return -1;
  }

  function close(returnFocus: boolean): void {
    if (menu.matches(":popover-open")) menu.hidePopover();
    active = -1;
    if (returnFocus) host.focus({ preventScroll: true });
  }

  function openAt(x: number, y: number): void {
    if (!props.items.some((item) => !item.disabled)) return;
    if (!menu.matches(":popover-open")) menu.showPopover();
    const box = menu.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    menu.style.left = `${Math.max(VIEWPORT_GAP, Math.min(x, viewportWidth - box.width - VIEWPORT_GAP))}px`;
    menu.style.top = `${Math.max(VIEWPORT_GAP, Math.min(y, viewportHeight - box.height - VIEWPORT_GAP))}px`;
    setActive(findEnabled(-1, 1), true);
  }

  function choose(index: number): void {
    const item = props.items[index];
    if (!item || item.disabled) return;
    close(true);
    emit("select", item.id);
  }

  function rebuild(): void {
    menu.replaceChildren();
    props.items.forEach((item, index) => {
      const row = document.createElement("div");
      const text = document.createElement("span");
      row.setAttribute("data-pica", "");
      row.setAttribute("data-pica-context-item", "");
      row.setAttribute("data-index", String(index));
      row.setAttribute("role", "menuitem");
      row.setAttribute("tabindex", "-1");
      if (item.disabled) row.setAttribute("aria-disabled", "true");
      text.setAttribute("data-pica", "");
      text.textContent = item.label;
      row.append(text);
      if (item.shortcut) {
        const shortcut = document.createElement("kbd");
        shortcut.setAttribute("data-pica", "");
        shortcut.setAttribute("data-pica-context-shortcut", "");
        shortcut.textContent = item.shortcut;
        row.append(shortcut);
      }
      menu.append(row);
    });
  }

  function stopPress(): void {
    if (pressTimer !== null) clearTimeout(pressTimer);
    pressTimer = null;
  }

  const onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    openAt(event.clientX, event.clientY);
  };
  const onHostKey = (event: KeyboardEvent): void => {
    if (event.target !== host) return;
    if ((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu") {
      event.preventDefault();
      const box = host.getBoundingClientRect();
      openAt(box.left + VIEWPORT_GAP, box.top + VIEWPORT_GAP);
    }
  };
  const onMenuKey = (event: KeyboardEvent): void => {
    if (!menu.matches(":popover-open")) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(findEnabled(active, event.key === "ArrowDown" ? 1 : -1), true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(findEnabled(event.key === "Home" ? -1 : 0, event.key === "Home" ? 1 : -1), true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const match = props.items.findIndex((item) => !item.disabled && item.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
      if (match >= 0) {
        event.preventDefault();
        setActive(match, true);
      }
    }
  };
  const onMenuPointer = (event: PointerEvent): void => {
    const row = (event.target as Element).closest<HTMLElement>("[data-pica-context-item]");
    if (!row || !menu.contains(row)) return;
    const index = Number(row.dataset.index);
    if (enabled(index)) setActive(index, true);
  };
  const onMenuClick = (event: MouseEvent): void => {
    const row = (event.target as Element).closest<HTMLElement>("[data-pica-context-item]");
    if (row && menu.contains(row)) choose(Number(row.dataset.index));
  };
  const onDocumentPointer = (event: PointerEvent): void => {
    if (menu.matches(":popover-open") && !menu.contains(event.target as Node)) close(false);
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== "touch") return;
    pressX = event.clientX;
    pressY = event.clientY;
    stopPress();
    pressTimer = setTimeout(() => {
      pressTimer = null;
      openAt(pressX, pressY);
    }, LONG_PRESS_MS);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 10) stopPress();
  };

  host.addEventListener("contextmenu", onContextMenu);
  host.addEventListener("keydown", onHostKey);
  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", stopPress);
  host.addEventListener("pointercancel", stopPress);
  menu.addEventListener("keydown", onMenuKey);
  menu.addEventListener("pointermove", onMenuPointer);
  menu.addEventListener("click", onMenuClick);
  document.addEventListener("pointerdown", onDocumentPointer, true);

  function apply(rebuildItems: boolean): void {
    attrs.set("tabindex", "0");
    attrs.set("aria-haspopup", "menu");
    attrs.set("aria-controls", menuId);
    attrs.set("aria-describedby", props.hint ? hintId : null);
    menu.setAttribute("aria-label", props.label);
    hint.textContent = props.hint;
    hint.hidden = !props.hint;
    sheet.setRules(contextMenuRules(sheet.selector));
    if (rebuildItems) rebuild();
  }

  apply(true);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      apply(changed(before, props, ["items"]));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopPress();
      close(false);
      host.removeEventListener("contextmenu", onContextMenu);
      host.removeEventListener("keydown", onHostKey);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", stopPress);
      host.removeEventListener("pointercancel", stopPress);
      menu.removeEventListener("keydown", onMenuKey);
      menu.removeEventListener("pointermove", onMenuPointer);
      menu.removeEventListener("click", onMenuClick);
      document.removeEventListener("pointerdown", onDocumentPointer, true);
      menu.remove();
      hint.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
