import { emitter } from "../../../lib/events";
import { hostAttributes, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ToggleGroupOption {
  /** The value reported when this option is pressed. */
  value: string;
  /** The visible button label. */
  label: string;
  /** Prevents this option from being toggled. */
  disabled?: boolean;
}

export interface ToggleGroupProps {
  /** The buttons shown in the toolbar. */
  options: readonly ToggleGroupOption[];
  /** The pressed values in controlled use, or null for uncontrolled use. */
  value: readonly string[] | null;
  /** The pressed values read once when uncontrolled use begins. */
  defaultValue: readonly string[];
  /** The accessible name of the toolbar. */
  label: string;
  /** The direction of the toolbar and its arrow key navigation. */
  orientation: "horizontal" | "vertical";
}

export interface ToggleGroupEvents {
  /** The pressed values after a button is activated, in option order. */
  valueChange: readonly string[];
}

export const defaults: ToggleGroupProps = {
  options: [
    { value: "grid", label: "Grid", disabled: false },
    { value: "snap", label: "Snap", disabled: false },
    { value: "guides", label: "Guides", disabled: false },
  ],
  value: null,
  defaultValue: ["grid"],
  label: "View options",
  orientation: "horizontal",
};

function orderedValues(values: readonly string[], options: readonly ToggleGroupOption[]): string[] {
  return options.filter((option) => values.includes(option.value)).map((option) => option.value);
}

function toggleGroupRules(selector: string, orientation: ToggleGroupProps["orientation"]): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const button = `${selector}>button[data-pica-toggle]`;
  const divider = orientation === "horizontal" ? "border-left" : "border-top";
  return [
    `${selector}{display:inline-flex;flex-direction:${orientation === "horizontal" ? "row" : "column"};align-items:stretch;width:max-content;max-width:100%;box-sizing:border-box;border:1px solid color-mix(in srgb, ${fg} 35%, transparent);border-radius:0;color:${fg};vertical-align:middle}`,
    `${button}{appearance:none;position:relative;box-sizing:border-box;min-block-size:2.75em;margin:0;padding:.7em 1em 1em;border:0;border-radius:0;background:transparent;color:inherit;font:inherit;line-height:1.2;text-align:center;cursor:pointer}`,
    `${button}+button[data-pica-toggle]{${divider}:1px solid color-mix(in srgb, ${fg} 35%, transparent)}`,
    `${button}::after{content:"";position:absolute;right:1em;bottom:.42em;left:1em;height:2px;background:transparent}`,
    `${button}[aria-pressed="true"]::after{background:${accent}}`,
    `${button}:hover:not([aria-disabled="true"]){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${button}:focus-visible{z-index:1;outline:2px solid ${accent};outline-offset:2px}`,
    `${button}[aria-disabled="true"]{opacity:.45;cursor:not-allowed}`,
  ].join("\n");
}

export const mount: Mount<ToggleGroupProps> = (host, initial = {}) => {
  let props: ToggleGroupProps = { ...defaults, ...initial };
  let internalValue = orderedValues(props.defaultValue, props.options);
  let buttons: HTMLButtonElement[] = [];
  let focusIndex = 0;
  const emit = emitter<ToggleGroupEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  const currentValue = (): string[] => orderedValues(props.value ?? internalValue, props.options);

  function syncButtons(): void {
    const pressed = currentValue();
    buttons.forEach((button, index) => {
      button.tabIndex = index === focusIndex ? 0 : -1;
      button.setAttribute("aria-pressed", pressed.includes(props.options[index]?.value ?? "") ? "true" : "false");
    });
    attrs.set("tabindex", buttons.length === 0 ? "0" : null);
  }

  function rebuildButtons(restoreFocus = false): void {
    for (const button of buttons) button.remove();
    buttons = props.options.map((option) => {
      const button = document.createElement("button");
      button.setAttribute("data-pica", "");
      button.setAttribute("data-pica-toggle", "");
      button.setAttribute("type", "button");
      button.setAttribute("aria-disabled", option.disabled ? "true" : "false");
      button.textContent = option.label;
      host.append(button);
      return button;
    });
    focusIndex = Math.min(focusIndex, Math.max(0, buttons.length - 1));
    syncButtons();
    if (restoreFocus) buttons[focusIndex]?.focus();
  }

  function applyHost(): void {
    attrs.set("role", "toolbar");
    attrs.set("aria-label", props.label);
    attrs.set("aria-orientation", props.orientation);
    sheet.setRules(toggleGroupRules(sheet.selector, props.orientation));
  }

  const buttonIndex = (target: EventTarget | null): number =>
    target instanceof HTMLButtonElement ? buttons.indexOf(target) : -1;

  const onFocus = (event: FocusEvent): void => {
    const index = buttonIndex(event.target);
    if (index < 0) return;
    focusIndex = index;
    syncButtons();
  };

  const onClick = (event: MouseEvent): void => {
    const index = buttonIndex(event.target);
    const option = props.options[index];
    if (index < 0 || !option || option.disabled) return;
    focusIndex = index;
    const values = new Set(currentValue());
    if (values.has(option.value)) values.delete(option.value);
    else values.add(option.value);
    const next = props.options.filter((item) => values.has(item.value)).map((item) => item.value);
    if (props.value === null) {
      internalValue = next;
      syncButtons();
    } else {
      syncButtons();
    }
    emit("valueChange", next);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const index = buttonIndex(event.target);
    if (index < 0 || buttons.length === 0) return;
    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else if (props.orientation === "horizontal" && event.key === "ArrowRight") next = (index + 1) % buttons.length;
    else if (props.orientation === "horizontal" && event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
    else if (props.orientation === "vertical" && event.key === "ArrowDown") next = (index + 1) % buttons.length;
    else if (props.orientation === "vertical" && event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
    else return;
    event.preventDefault();
    focusIndex = next;
    syncButtons();
    buttons[next]?.focus();
  };

  host.addEventListener("focusin", onFocus);
  host.addEventListener("click", onClick);
  host.addEventListener("keydown", onKeyDown);
  applyHost();
  rebuildButtons();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      const hadFocus = buttons.includes(document.activeElement as HTMLButtonElement);
      props = { ...props, ...next };
      if (before.value !== null && props.value === null) internalValue = orderedValues(before.value, props.options);
      if (!sameJson(before.options, props.options)) {
        internalValue = orderedValues(internalValue, props.options);
        rebuildButtons(hadFocus);
      } else {
        syncButtons();
      }
      applyHost();
    },
    destroy() {
      host.removeEventListener("focusin", onFocus);
      host.removeEventListener("click", onClick);
      host.removeEventListener("keydown", onKeyDown);
      for (const button of buttons) button.remove();
      buttons = [];
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
