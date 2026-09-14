import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface MenuItem {
  /** A stable value reported when the item is chosen. */
  id: string;
  /** The action text shown in the menu. */
  label: string;
  /** An optional keyboard shortcut hint. */
  shortcut: string;
  /** Dims the item and prevents activation. */
  disabled: boolean;
}

export interface MenuProps {
  /** The actions shown when the trigger opens the menu. */
  items: readonly MenuItem[];
  /** The trigger button text. */
  label: string;
  /** Blocks input and dims the trigger. */
  disabled: boolean;
}

export interface MenuEvents {
  /** An enabled item was activated. */
  select: string;
}

export const defaults: MenuProps = {
  items: [
    { id: "duplicate", label: "Duplicate", shortcut: "⌘D", disabled: false },
    { id: "rename", label: "Rename", shortcut: "", disabled: false },
    { id: "archive", label: "Archive", shortcut: "⌘E", disabled: false },
    { id: "delete", label: "Delete", shortcut: "⌫", disabled: false },
  ],
  label: "Actions",
  disabled: false,
};

function menuRules(hostSelector: string, menuSelector: string, anchor: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return [
    `${hostSelector}{appearance:none;margin:0;padding:0.45em 0.75em;display:inline-flex;align-items:center;gap:0.65em;border:1px solid ${muted};border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1.2;cursor:pointer;anchor-name:${anchor}}`,
    `${hostSelector}:hover:not(:disabled){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${hostSelector}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${hostSelector}:disabled{opacity:0.45;cursor:not-allowed}`,
    `${hostSelector}>[data-pica-chevron]{color:${accent};font-family:${GRID_FONT};font-size:0.8em}`,
    `${menuSelector}{box-sizing:border-box;position:fixed;position-anchor:${anchor};inset:auto;margin:6px 0 0;padding:4px;min-width:12em;max-width:calc(100vw - 8px);border:1px solid ${muted};border-radius:0;background:inherit;color:${fg};font:inherit;line-height:1.2}`,
    `${menuSelector}::backdrop{background:transparent}`,
    `${menuSelector}>[role="menuitem"]{box-sizing:border-box;padding:0.5em 0.6em;display:flex;align-items:center;justify-content:space-between;gap:2em;min-width:0;outline:none;cursor:pointer}`,
    `${menuSelector}>[role="menuitem"][data-active="true"]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${menuSelector}>[role="menuitem"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${menuSelector}>[role="menuitem"][aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    `${menuSelector} [data-pica-shortcut]{margin-left:auto;color:${muted};font-family:${GRID_FONT};font-size:0.8em;white-space:nowrap}`,
    `@supports (position-anchor:${anchor}){${menuSelector}{top:anchor(bottom);left:anchor(left);min-width:max(12em,anchor-size(width))}}`,
  ].join("\n");
}

export const mount: Mount<MenuProps> = (host, initial = {}) => {
  let props: MenuProps = { ...defaults, ...initial };
  let open = false;
  let activeIndex = -1;
  const emit = emitter<MenuEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const menuId = nextId("pica-menu");
  const menuSelector = `#${menuId}`;
  const anchor = `--${menuId}`;
  const label = document.createElement("span");
  const chevron = document.createElement("span");
  const popover = document.createElement("div");

  label.setAttribute("data-pica", "");
  chevron.setAttribute("data-pica", "");
  chevron.setAttribute("data-pica-chevron", "");
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▾";
  popover.setAttribute("data-pica", "");
  popover.id = menuId;
  popover.popover = "manual";
  popover.setAttribute("role", "menu");
  host.append(label, chevron);
  document.body.append(popover);

  function rows(): HTMLElement[] {
    return Array.from(popover.querySelectorAll<HTMLElement>(":scope > [role=menuitem]"));
  }

  function setActive(index: number, focus: boolean): void {
    const entries = rows();
    if (entries.length === 0) {
      activeIndex = -1;
      return;
    }
    activeIndex = ((index % entries.length) + entries.length) % entries.length;
    for (const [rowIndex, row] of entries.entries()) {
      const active = rowIndex === activeIndex;
      row.dataset.active = String(active);
      row.tabIndex = active ? 0 : -1;
    }
    if (focus) entries[activeIndex]?.focus();
  }

  function positionPopover(): void {
    if (CSS.supports("position-anchor", anchor)) {
      popover.style.removeProperty("left");
      popover.style.removeProperty("top");
      popover.style.removeProperty("min-width");
      return;
    }
    const rect = host.getBoundingClientRect();
    popover.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - 196))}px`;
    popover.style.top = `${rect.bottom}px`;
    popover.style.minWidth = `${rect.width}px`;
  }

  function closeMenu(returnFocus: boolean): void {
    if (!open) return;
    open = false;
    attrs.set("aria-expanded", "false");
    if (popover.matches(":popover-open")) popover.hidePopover();
    if (returnFocus) host.focus();
  }

  function openMenu(edge: "first" | "last"): void {
    if (props.disabled || props.items.length === 0) return;
    if (!open) {
      positionPopover();
      popover.showPopover();
      open = true;
      attrs.set("aria-expanded", "true");
    }
    setActive(edge === "first" ? 0 : props.items.length - 1, true);
  }

  function activate(index: number): void {
    const item = props.items[index];
    if (!item || item.disabled) return;
    emit("select", item.id);
    closeMenu(true);
  }

  function rebuildItems(): void {
    const hadFocus = popover.contains(document.activeElement);
    popover.replaceChildren();
    for (const [index, item] of props.items.entries()) {
      const row = document.createElement("div");
      const itemLabel = document.createElement("span");
      row.setAttribute("data-pica", "");
      row.setAttribute("role", "menuitem");
      row.setAttribute("aria-disabled", String(item.disabled));
      row.dataset.menuIndex = String(index);
      row.tabIndex = -1;
      itemLabel.setAttribute("data-pica", "");
      itemLabel.textContent = item.label;
      row.append(itemLabel);
      if (item.shortcut) {
        const shortcut = document.createElement("span");
        shortcut.setAttribute("data-pica", "");
        shortcut.setAttribute("data-pica-shortcut", "");
        shortcut.setAttribute("aria-hidden", "true");
        shortcut.textContent = item.shortcut;
        row.append(shortcut);
      }
      popover.append(row);
    }
    if (open) setActive(Math.min(Math.max(activeIndex, 0), props.items.length - 1), hadFocus);
  }

  const onTriggerClick = (event: MouseEvent): void => {
    if (props.disabled) return;
    if (event.detail === 0 && open) return;
    if (open) closeMenu(false);
    else openMenu("first");
  };

  const onTriggerKeyDown = (event: KeyboardEvent): void => {
    if (props.disabled) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu("last");
    } else if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu("first");
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1), true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : props.items.length - 1, true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu(false);
    } else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const needle = event.key.toLocaleLowerCase();
      for (let offset = 1; offset <= props.items.length; offset++) {
        const index = (activeIndex + offset) % props.items.length;
        if (props.items[index]?.label.trim().toLocaleLowerCase().startsWith(needle)) {
          event.preventDefault();
          setActive(index, true);
          break;
        }
      }
    }
  };

  const onMenuPointerMove = (event: PointerEvent): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[role=menuitem]") : null;
    if (target && popover.contains(target)) setActive(Number(target.dataset.menuIndex), false);
  };

  const onMenuClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[role=menuitem]") : null;
    if (target && popover.contains(target)) activate(Number(target.dataset.menuIndex));
  };

  const onOutsidePointerDown = (event: PointerEvent): void => {
    const path = event.composedPath();
    if (open && !path.includes(host) && !path.includes(popover)) closeMenu(false);
  };

  const onReposition = (): void => {
    if (open) positionPopover();
  };

  const onToggle = (): void => {
    if (open && !popover.matches(":popover-open")) {
      open = false;
      attrs.set("aria-expanded", "false");
    }
  };

  host.addEventListener("click", onTriggerClick);
  host.addEventListener("keydown", onTriggerKeyDown);
  popover.addEventListener("keydown", onMenuKeyDown);
  popover.addEventListener("pointermove", onMenuPointerMove);
  popover.addEventListener("click", onMenuClick);
  popover.addEventListener("toggle", onToggle);
  document.addEventListener("pointerdown", onOutsidePointerDown, true);
  window.addEventListener("resize", onReposition);
  window.addEventListener("scroll", onReposition, true);

  function apply(previousItems?: readonly MenuItem[]): void {
    attrs.set("type", "button");
    attrs.set("disabled", props.disabled ? "" : null);
    attrs.set("aria-haspopup", "menu");
    attrs.set("aria-expanded", String(open));
    attrs.set("aria-controls", menuId);
    label.textContent = props.label;
    popover.setAttribute("aria-label", `${props.label} menu`);
    sheet.setRules(menuRules(sheet.selector, menuSelector, anchor));
    if (!previousItems || !sameJson(previousItems, props.items)) rebuildItems();
    if (props.disabled) closeMenu(false);
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const previousItems = props.items;
      props = { ...props, ...next };
      apply(previousItems);
    },
    destroy() {
      closeMenu(false);
      host.removeEventListener("click", onTriggerClick);
      host.removeEventListener("keydown", onTriggerKeyDown);
      popover.removeEventListener("keydown", onMenuKeyDown);
      popover.removeEventListener("pointermove", onMenuPointerMove);
      popover.removeEventListener("click", onMenuClick);
      popover.removeEventListener("toggle", onToggle);
      document.removeEventListener("pointerdown", onOutsidePointerDown, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      label.remove();
      chevron.remove();
      popover.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
