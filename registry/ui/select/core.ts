import { labelHost, unlabelHost } from "../../../lib/a11y";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface SelectOption {
  /** The value reported when this option is chosen. */
  value: string;
  /** The text shown for this option, in the trigger and in the listbox. */
  label: string;
  /** Removes the option from keyboard and pointer choice, and dims it. */
  disabled: boolean;
}

export interface SelectProps {
  /** The choices offered, in order. */
  options: readonly SelectOption[];
  /** The chosen value. Null means uncontrolled, so the component tracks its own choice. */
  value: string | null;
  /** The value chosen at mount, read once, while value is null. */
  defaultValue: string;
  /** Shown in the trigger when nothing is chosen. */
  placeholder: string;
  /** The accessible name for the control. An empty label hides it. */
  label: string;
  /** Blocks input and dims the trigger. */
  disabled: boolean;
}

export interface SelectEvents {
  /** The value of the option the user chose. */
  valueChange: string;
}

export const defaults: SelectProps = {
  options: [
    { value: "ascii", label: "ASCII", disabled: false },
    { value: "dither", label: "Dither", disabled: false },
    { value: "shaders", label: "Shaders", disabled: false },
    { value: "charts", label: "Charts", disabled: false },
  ],
  value: null,
  defaultValue: "ascii",
  placeholder: "Choose one",
  label: "Family",
  disabled: false,
};

/** A drawn check, in the accent, beside the chosen option. */
const CHECK = "✓";
/** The chevron glyph, closed and open. It flips instantly; nothing about this component transitions. */
const CHEVRON_CLOSED = "▾";
const CHEVRON_OPEN = "▴";
/** Silence between keystrokes that ends a typeahead search. */
const TYPEAHEAD_RESET_MS = 600;

/** The scoped rules for one select. The trigger and options take the page's font; only the chevron and the
 *  check are mono. The listbox is a Popover API element, positioned by CSS anchoring when the browser has it;
 *  `anchorVar` is the anchor-name shared between the trigger and the listbox's `anchor()` offsets. */
function rules(s: string, anchorVar: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${s}{display:inline-flex;align-items:center;justify-content:space-between;gap:0.6em;min-width:8em;box-sizing:border-box;font:inherit;color:${fg};background:transparent;border:1px solid ${fg};border-radius:0;padding:0.45em 0.7em;cursor:pointer;user-select:none;white-space:nowrap;anchor-name:${anchorVar}}`,
    `${s}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s}[aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    `${s} [data-pica-chevron]{font-family:${GRID_FONT};color:${accent};line-height:1;flex:none}`,
    `${s} [data-pica-listbox]{position:fixed;inset:auto;top:anchor(${anchorVar} bottom);left:anchor(${anchorVar} left);min-width:anchor-size(${anchorVar} width);margin:0.25em 0 0;padding:0.25em 0;border:1px solid ${fg};background:transparent;color:${fg};font:inherit;max-height:16em;overflow:auto;box-sizing:border-box}`,
    `${s} [data-pica-option]{display:flex;align-items:center;gap:0.5em;padding:0.35em 0.7em;white-space:nowrap;cursor:pointer}`,
    `${s} [data-pica-option][data-active="true"]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-pica-option][aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    `${s} [data-pica-check]{font-family:${GRID_FONT};color:${accent};width:1em;flex:none;text-align:center}`,
  ].join("\n");
}

export const mount: Mount<SelectProps> = (host, initial = {}) => {
  let props: SelectProps = { ...defaults, ...initial };
  // Tracks the choice while uncontrolled, and mirrors the last controlled value so a component that later
  // loses control resumes from it rather than from whatever it held at mount.
  let current: string = props.value ?? props.defaultValue;
  let lastOptions: readonly SelectOption[] | undefined;
  let rows: HTMLElement[] = [];
  let activeIndex = -1;
  let openState = false;
  let typeaheadBuffer = "";
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  const emit = emitter<SelectEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const listboxId = nextId("pica-select-listbox");
  const anchorVar = `--${nextId("pica-select-anchor")}`;
  const supportsAnchor = typeof CSS !== "undefined" && CSS.supports("anchor-name", anchorVar);

  const valueEl = document.createElement("span");
  valueEl.setAttribute("data-pica", "");
  const chevronEl = document.createElement("span");
  chevronEl.setAttribute("data-pica", "");
  chevronEl.setAttribute("data-pica-chevron", "");
  chevronEl.setAttribute("aria-hidden", "true");
  const listboxEl = document.createElement("div");
  listboxEl.setAttribute("data-pica", "");
  listboxEl.setAttribute("data-pica-listbox", "");
  listboxEl.setAttribute("popover", "manual");
  listboxEl.setAttribute("role", "listbox");
  listboxEl.id = listboxId;
  host.append(valueEl, chevronEl, listboxEl);

  function effectiveValue(): string {
    return props.value !== null ? props.value : current;
  }

  function indexForValue(value: string): number {
    return props.options.findIndex((option) => option.value === value);
  }

  function enabledIndices(): number[] {
    const list: number[] = [];
    for (let i = 0; i < props.options.length; i++) {
      if (!props.options[i]?.disabled) list.push(i);
    }
    return list;
  }

  function firstEnabled(): number {
    return enabledIndices().at(0) ?? -1;
  }

  function lastEnabled(): number {
    return enabledIndices().at(-1) ?? -1;
  }

  /** Moves `delta` enabled options from `from`, clamped at the ends rather than wrapping, for the arrow,
   *  page, home, and end keys while the listbox is open. */
  function stepEnabled(from: number, delta: number): number {
    const list = enabledIndices();
    if (list.length === 0) return -1;
    const at = list.indexOf(from);
    const base = at === -1 ? (delta > 0 ? -1 : list.length) : at;
    const next = Math.max(0, Math.min(list.length - 1, base + delta));
    return list[next] ?? -1;
  }

  function defaultActiveIndex(): number {
    const index = indexForValue(effectiveValue());
    return index !== -1 ? index : firstEnabled();
  }

  function renderOptions(): void {
    listboxEl.replaceChildren();
    rows = props.options.map((option, index) => {
      const row = document.createElement("div");
      row.setAttribute("data-pica", "");
      row.setAttribute("data-pica-option", "");
      row.setAttribute("role", "option");
      row.id = `${listboxId}-opt-${index}`;
      row.dataset.picaIndex = String(index);
      row.setAttribute("aria-selected", "false");
      if (option.disabled) row.setAttribute("aria-disabled", "true");
      const check = document.createElement("span");
      check.setAttribute("data-pica", "");
      check.setAttribute("data-pica-check", "");
      check.setAttribute("aria-hidden", "true");
      row.append(check, document.createTextNode(option.label));
      return row;
    });
    listboxEl.append(...rows);
  }

  function renderChosenMarks(): void {
    const chosen = indexForValue(effectiveValue());
    rows.forEach((row, index) => {
      const check = row.querySelector("[data-pica-check]");
      if (check) check.textContent = index === chosen ? CHECK : "";
    });
  }

  /** The accessible name carries both what the control is for and its current value, the way a native
   *  select's name and value are both announced: there is no external <label> a self-contained component
   *  could point aria-labelledby at, so the two are combined into one aria-label. */
  function renderTrigger(): void {
    const index = indexForValue(effectiveValue());
    const shown = index === -1 ? props.placeholder : (props.options[index]?.label ?? props.placeholder);
    valueEl.textContent = shown;
    labelHost(host, props.label ? `${props.label}, ${shown}` : "", "combobox");
  }

  function applyState(): void {
    const hidden = !props.label;
    attrs.set("aria-controls", hidden ? null : listboxId);
    attrs.set("aria-expanded", String(openState));
    attrs.set("tabindex", hidden || props.disabled ? "-1" : "0");
    attrs.set("aria-disabled", props.disabled ? "true" : null);
    chevronEl.textContent = openState ? CHEVRON_OPEN : CHEVRON_CLOSED;
  }

  function setActive(index: number): void {
    if (index === activeIndex) return;
    const prev = activeIndex >= 0 ? rows[activeIndex] : undefined;
    prev?.removeAttribute("data-active");
    prev?.setAttribute("aria-selected", "false");
    activeIndex = index;
    const row = activeIndex >= 0 ? rows[activeIndex] : undefined;
    if (row) {
      row.setAttribute("data-active", "true");
      row.setAttribute("aria-selected", "true");
      attrs.set("aria-activedescendant", row.id);
      row.scrollIntoView({ block: "nearest" });
    } else {
      attrs.set("aria-activedescendant", null);
    }
  }

  /** The getBoundingClientRect fallback for browsers without CSS anchor positioning. A no-op where anchoring
   *  works, since the scoped stylesheet's anchor() offsets place the listbox there without any script. */
  function position(): void {
    if (supportsAnchor) return;
    const rect = host.getBoundingClientRect();
    listboxEl.style.top = `${rect.bottom}px`;
    listboxEl.style.left = `${rect.left}px`;
    listboxEl.style.minWidth = `${rect.width}px`;
  }

  function setOpen(next: boolean, options?: { activeIndex?: number }): void {
    if (openState === next) {
      if (next && options?.activeIndex !== undefined) setActive(options.activeIndex);
      return;
    }
    openState = next;
    if (next) {
      listboxEl.showPopover();
      position();
      setActive(options?.activeIndex ?? defaultActiveIndex());
      document.addEventListener("pointerdown", onOutsidePointerDown, true);
      if (!supportsAnchor) {
        window.addEventListener("resize", position);
        window.addEventListener("scroll", position, true);
      }
    } else {
      listboxEl.hidePopover();
      document.removeEventListener("pointerdown", onOutsidePointerDown, true);
      if (!supportsAnchor) {
        window.removeEventListener("resize", position);
        window.removeEventListener("scroll", position, true);
      }
      setActive(-1);
    }
    applyState();
  }

  function choose(index: number): void {
    const option = props.options[index];
    if (!option || option.disabled) return;
    if (props.value === null) current = option.value;
    emit("valueChange", option.value);
    setOpen(false);
    renderTrigger();
    renderChosenMarks();
  }

  /** Printable, non-space keys: opens if needed and moves to the next option starting with the typed text.
   *  The same character repeated cycles through its matches; different characters in quick succession match
   *  the whole typed string. Returns whether the key was used, so the caller can suppress its default. */
  function typeaheadKey(key: string): boolean {
    if (key.length !== 1 || key === " ") return false;
    if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer);
    typeaheadBuffer += key.toLowerCase();
    typeaheadTimer = setTimeout(() => {
      typeaheadBuffer = "";
    }, TYPEAHEAD_RESET_MS);
    const first = typeaheadBuffer[0] ?? "";
    const repeat = [...typeaheadBuffer].every((c) => c === first);
    const query = repeat ? first : typeaheadBuffer;
    const enabled = enabledIndices();
    const at = enabled.indexOf(activeIndex);
    const ordered = at === -1 ? enabled : [...enabled.slice(at + 1), ...enabled.slice(0, at + 1)];
    const match = ordered.find((index) => (props.options[index]?.label ?? "").toLowerCase().startsWith(query));
    if (match !== undefined) {
      if (openState) setActive(match);
      else setOpen(true, { activeIndex: match });
    }
    return true;
  }

  function onOutsidePointerDown(e: PointerEvent): void {
    if (!host.contains(e.target as Node)) setOpen(false);
  }

  function onHostFocusOut(e: FocusEvent): void {
    if (host.contains(e.relatedTarget as Node | null)) return;
    if (openState) setOpen(false);
  }

  function onHostPointerOver(e: PointerEvent): void {
    if (!openState || props.disabled) return;
    const row = (e.target as HTMLElement).closest?.("[data-pica-option]") as HTMLElement | null;
    if (!row || !listboxEl.contains(row)) return;
    const index = Number(row.dataset.picaIndex);
    if (Number.isNaN(index) || props.options[index]?.disabled) return;
    setActive(index);
  }

  function onHostClick(e: MouseEvent): void {
    if (props.disabled || !props.label) return;
    const target = e.target as HTMLElement;
    const row = target.closest("[data-pica-option]") as HTMLElement | null;
    if (row && listboxEl.contains(row)) {
      const index = Number(row.dataset.picaIndex);
      if (!Number.isNaN(index)) choose(index);
      return;
    }
    if (listboxEl.contains(target)) return;
    setOpen(!openState, openState ? undefined : { activeIndex: defaultActiveIndex() });
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (props.disabled || !props.label) return;
    const key = e.key;
    if (!openState) {
      if (key === "ArrowDown" || key === "Enter" || key === " ") {
        e.preventDefault();
        setOpen(true, { activeIndex: defaultActiveIndex() });
        return;
      }
      if (key === "ArrowUp" || key === "Home") {
        e.preventDefault();
        setOpen(true, { activeIndex: firstEnabled() });
        return;
      }
      if (key === "End") {
        e.preventDefault();
        setOpen(true, { activeIndex: lastEnabled() });
        return;
      }
      if (typeaheadKey(key)) e.preventDefault();
      return;
    }
    if (key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      choose(activeIndex);
      return;
    }
    if (key === "Tab") {
      choose(activeIndex);
      return;
    }
    if (key === "ArrowDown") {
      e.preventDefault();
      setActive(stepEnabled(activeIndex, 1));
      return;
    }
    if (key === "ArrowUp") {
      e.preventDefault();
      if (e.altKey) choose(activeIndex);
      else setActive(stepEnabled(activeIndex, -1));
      return;
    }
    if (key === "Home") {
      e.preventDefault();
      setActive(firstEnabled());
      return;
    }
    if (key === "End") {
      e.preventDefault();
      setActive(lastEnabled());
      return;
    }
    if (key === "PageDown") {
      e.preventDefault();
      setActive(stepEnabled(activeIndex, 10));
      return;
    }
    if (key === "PageUp") {
      e.preventDefault();
      setActive(stepEnabled(activeIndex, -10));
      return;
    }
    if (typeaheadKey(key)) e.preventDefault();
  }

  function apply(): void {
    sheet.setRules(rules(sheet.selector, anchorVar));
    if (lastOptions === undefined || !sameJson(props.options, lastOptions)) {
      lastOptions = props.options;
      renderOptions();
      activeIndex = -1;
      if (openState) setActive(defaultActiveIndex());
    }
    if (props.value !== null) current = props.value;
    renderTrigger();
    renderChosenMarks();
    if (props.disabled && openState) setOpen(false);
    applyState();
  }

  host.addEventListener("keydown", onKeyDown);
  host.addEventListener("click", onHostClick);
  host.addEventListener("pointerover", onHostPointerOver);
  host.addEventListener("focusout", onHostFocusOut);

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      setOpen(false);
      host.removeEventListener("keydown", onKeyDown);
      host.removeEventListener("click", onHostClick);
      host.removeEventListener("pointerover", onHostPointerOver);
      host.removeEventListener("focusout", onHostFocusOut);
      if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer);
      unlabelHost(host);
      valueEl.remove();
      chevronEl.remove();
      listboxEl.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
