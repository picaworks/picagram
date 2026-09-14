import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ComboboxOption {
  /** The value reported when this option is chosen. */
  value: string;
  /** The text shown in the field and listbox. */
  label: string;
  /** Prevents this option from becoming active or chosen. */
  disabled?: boolean;
}

export interface ComboboxProps {
  /** The suggestions available to filter and choose. */
  options: readonly ComboboxOption[];
  /** The chosen value, or null to let the component manage its own value. */
  value: string | null;
  /** The initial chosen value when value is null. */
  defaultValue: string;
  /** The hint shown while the editable field is empty. */
  placeholder: string;
  /** The message shown when no option matches the typed text. */
  emptyText: string;
  /** The visible and accessible name of the editable field. */
  label: string;
  /** Blocks editing and selection, and dims the control. */
  disabled: boolean;
}

export interface ComboboxEvents {
  /** An option was chosen through the keyboard or pointer. */
  valueChange: string;
}

export const defaults: ComboboxProps = {
  options: [
    { value: "dither-field", label: "Dither Field" },
    { value: "mesh-gradient", label: "Mesh Gradient" },
    { value: "scanlines", label: "Scanlines" },
    { value: "bar-chart", label: "Bar Chart" },
    { value: "tabs", label: "Tabs" },
    { value: "select", label: "Select" },
  ],
  value: null,
  defaultValue: "",
  placeholder: "Search components",
  emptyText: "No matches",
  label: "Component",
  disabled: false,
};

function comboboxRules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return [
    `${s}{color:${fg}}`,
    `${s} [data-part="root"]{width:min(22em,calc(100vw - 2em))}`,
    `${s}[data-disabled="true"]{opacity:0.45}`,
    `${s} [data-part="label"]{display:block;margin:0 0 0.45em;font-family:${GRID_FONT};font-size:0.7em;line-height:1.2;letter-spacing:0.04em;text-transform:uppercase;color:${muted}}`,
    `${s} [data-part="field"]{display:grid;grid-template-columns:minmax(0,1fr) 2.5em;box-sizing:border-box;border:1px solid ${fg};border-radius:0;background:transparent}`,
    `${s} [data-part="field"]:has(input:focus-visible){outline:2px solid ${accent};outline-offset:2px}`,
    `${s} input{box-sizing:border-box;width:100%;min-width:0;margin:0;padding:0.65em 0.75em;border:0;border-radius:0;outline:0;background:transparent;color:${fg};font-family:${GRID_FONT};font-size:1em;line-height:1.25}`,
    `${s} input::placeholder{color:${muted};opacity:1}`,
    `${s} [data-part="toggle"]{appearance:none;display:grid;place-items:center;box-sizing:border-box;width:100%;margin:0;padding:0;border:0;border-left:1px solid color-mix(in srgb, ${fg} 28%, transparent);border-radius:0;background:transparent;color:${accent};font-family:${GRID_FONT};font-size:1em;line-height:1;cursor:pointer}`,
    `${s} [data-part="toggle"]:disabled{cursor:not-allowed}`,
    `${s} [data-part="listbox"]{position:fixed;inset:auto;box-sizing:border-box;max-height:15rem;margin:4px 0 0;padding:0.3em;border:1px solid ${fg};border-radius:0;background:color-mix(in srgb, ${fg} 6%, Canvas);color:${fg};font:inherit;overflow:auto;z-index:2147483647}`,
    `${s} [data-part="option"]{display:grid;grid-template-columns:1.35em minmax(0,1fr);align-items:center;box-sizing:border-box;min-height:2.2em;padding:0.45em 0.6em;cursor:pointer}`,
    `${s} [data-part="option"][data-active="true"]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-part="option"][aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    `${s} [data-part="check"]{color:${accent};font-family:${GRID_FONT}}`,
    `${s} [data-part="empty"]{padding:0.6em;color:${muted}}`,
  ].join("\n");
}

export const mount: Mount<ComboboxProps> = (host, initial = {}) => {
  let props: ComboboxProps = { ...defaults, ...initial };
  let chosenValue = props.value ?? props.defaultValue;
  let query = props.options.find((option) => option.value === chosenValue)?.label ?? "";
  let open = false;
  let active = -1;
  const emit = emitter<ComboboxEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const inputId = nextId("pica-combobox");
  const labelId = nextId("pica-combobox-label");
  const listboxId = nextId("pica-combobox-listbox");
  const anchorName = `--${inputId}`;
  const anchored = CSS.supports("anchor-name", anchorName) && CSS.supports("top", "anchor(bottom)");
  const root = document.createElement("div");
  const label = document.createElement("label");
  const field = document.createElement("div");
  const input = document.createElement("input");
  const toggle = document.createElement("button");
  const listbox = document.createElement("div");

  root.setAttribute("data-pica", "");
  root.dataset.part = "root";
  label.setAttribute("data-pica", "");
  label.dataset.part = "label";
  label.id = labelId;
  label.htmlFor = inputId;
  field.setAttribute("data-pica", "");
  field.dataset.part = "field";
  field.style.setProperty("anchor-name", anchorName);
  input.setAttribute("data-pica", "");
  input.id = inputId;
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-controls", listboxId);
  input.setAttribute("aria-expanded", "false");
  toggle.setAttribute("data-pica", "");
  toggle.dataset.part = "toggle";
  toggle.type = "button";
  toggle.tabIndex = -1;
  toggle.textContent = "⌄";
  toggle.setAttribute("aria-label", "Show suggestions");
  listbox.setAttribute("data-pica", "");
  listbox.dataset.part = "listbox";
  listbox.id = listboxId;
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("aria-labelledby", labelId);
  listbox.setAttribute("popover", "manual");
  if (anchored) listbox.style.setProperty("position-anchor", anchorName);

  field.append(input, toggle);
  root.append(label, field, listbox);
  host.append(root);
  sheet.setRules(comboboxRules(sheet.selector));

  const optionId = (index: number): string => `${listboxId}-option-${index}`;
  const visibleIndices = (): number[] => {
    const needle = query.toLowerCase();
    const indices: number[] = [];
    props.options.forEach((option, index) => {
      if (option.label.toLowerCase().includes(needle)) indices.push(index);
    });
    return indices;
  };

  function syncActive(reveal = false): void {
    const optionNodes = listbox.querySelectorAll<HTMLElement>("[data-option]");
    optionNodes.forEach((node) => {
      node.dataset.active = node.dataset.option === String(active) ? "true" : "false";
    });
    if (open && active >= 0) {
      input.setAttribute("aria-activedescendant", optionId(active));
      if (reveal) listbox.querySelector<HTMLElement>(`#${optionId(active)}`)?.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function renderOptions(): void {
    const fragment = document.createDocumentFragment();
    const visible = visibleIndices();
    if (!visible.includes(active)) active = -1;
    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.setAttribute("data-pica", "");
      empty.dataset.part = "empty";
      empty.textContent = props.emptyText;
      fragment.append(empty);
    } else {
      for (const index of visible) {
        const option = props.options[index];
        if (!option) continue;
        const row = document.createElement("div");
        const check = document.createElement("span");
        const text = document.createElement("span");
        row.setAttribute("data-pica", "");
        row.dataset.part = "option";
        row.dataset.option = String(index);
        row.id = optionId(index);
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", option.value === chosenValue ? "true" : "false");
        if (option.disabled) row.setAttribute("aria-disabled", "true");
        check.setAttribute("data-pica", "");
        check.dataset.part = "check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = option.value === chosenValue ? "✓" : "";
        text.setAttribute("data-pica", "");
        text.textContent = option.label;
        row.append(check, text);
        fragment.append(row);
      }
    }
    listbox.replaceChildren(fragment);
    syncActive();
  }

  function placeListbox(): void {
    if (anchored) return;
    const rect = field.getBoundingClientRect();
    listbox.style.left = `${rect.left}px`;
    listbox.style.top = `${rect.bottom}px`;
    listbox.style.width = `${rect.width}px`;
  }

  function setOpen(next: boolean): void {
    if (next && props.disabled) return;
    open = next;
    input.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      renderOptions();
      placeListbox();
      if (!listbox.matches(":popover-open")) listbox.showPopover();
    } else {
      active = -1;
      syncActive();
      if (listbox.matches(":popover-open")) listbox.hidePopover();
    }
  }

  function moveActive(direction: 1 | -1): void {
    const enabled = visibleIndices().filter((index) => !props.options[index]?.disabled);
    if (enabled.length === 0) return;
    const position = enabled.indexOf(active);
    active = position < 0
      ? (direction === 1 ? enabled[0] ?? -1 : enabled[enabled.length - 1] ?? -1)
      : enabled[(position + direction + enabled.length) % enabled.length] ?? -1;
    syncActive(true);
  }

  function choose(index: number): void {
    const option = props.options[index];
    if (!option || option.disabled) return;
    if (props.value === null) {
      chosenValue = option.value;
      query = option.label;
      input.value = query;
      renderOptions();
    } else {
      query = props.options.find((item) => item.value === props.value)?.label ?? "";
      input.value = query;
    }
    setOpen(false);
    emit("valueChange", option.value);
  }

  const onInput = (): void => {
    query = input.value;
    active = -1;
    setOpen(true);
  };
  const onInputClick = (): void => setOpen(true);
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      moveActive(1);
    } else if (event.key === "ArrowUp" && event.altKey) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      moveActive(-1);
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };
  const onTogglePointerDown = (event: PointerEvent): void => event.preventDefault();
  const onToggleClick = (): void => {
    input.focus({ preventScroll: true });
    setOpen(!open);
  };
  const optionFromEvent = (event: Event): HTMLElement | null => {
    const target = event.target;
    return target instanceof Element ? target.closest<HTMLElement>("[data-option]") : null;
  };
  const onListboxPointerOver = (event: PointerEvent): void => {
    const row = optionFromEvent(event);
    const index = Number(row?.dataset.option);
    if (row && !props.options[index]?.disabled) {
      active = index;
      syncActive();
    }
  };
  const onListboxPointerDown = (event: PointerEvent): void => event.preventDefault();
  const onListboxClick = (event: MouseEvent): void => {
    const row = optionFromEvent(event);
    if (row) choose(Number(row.dataset.option));
  };
  const onOutsidePointerDown = (event: PointerEvent): void => {
    if (open && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
  };
  const onPosition = (): void => {
    if (open) placeListbox();
  };

  input.addEventListener("input", onInput);
  input.addEventListener("click", onInputClick);
  input.addEventListener("keydown", onKeyDown);
  toggle.addEventListener("pointerdown", onTogglePointerDown);
  toggle.addEventListener("click", onToggleClick);
  listbox.addEventListener("pointerover", onListboxPointerOver);
  listbox.addEventListener("pointerdown", onListboxPointerDown);
  listbox.addEventListener("click", onListboxClick);
  document.addEventListener("pointerdown", onOutsidePointerDown);
  window.addEventListener("resize", onPosition);
  window.addEventListener("scroll", onPosition, true);

  function apply(): void {
    attrs.set("data-disabled", props.disabled ? "true" : null);
    label.textContent = props.label;
    input.placeholder = props.placeholder;
    input.disabled = props.disabled;
    toggle.disabled = props.disabled;
    if (props.disabled) setOpen(false);
    input.value = query;
    renderOptions();
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const nextValue = next.value;
      props = { ...props, ...next };
      if (nextValue !== undefined && nextValue !== null) {
        chosenValue = nextValue;
        query = props.options.find((option) => option.value === nextValue)?.label ?? "";
      }
      apply();
    },
    destroy() {
      setOpen(false);
      input.removeEventListener("input", onInput);
      input.removeEventListener("click", onInputClick);
      input.removeEventListener("keydown", onKeyDown);
      toggle.removeEventListener("pointerdown", onTogglePointerDown);
      toggle.removeEventListener("click", onToggleClick);
      listbox.removeEventListener("pointerover", onListboxPointerOver);
      listbox.removeEventListener("pointerdown", onListboxPointerDown);
      listbox.removeEventListener("click", onListboxClick);
      document.removeEventListener("pointerdown", onOutsidePointerDown);
      window.removeEventListener("resize", onPosition);
      window.removeEventListener("scroll", onPosition, true);
      root.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
