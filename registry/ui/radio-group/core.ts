import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface RadioGroupOption {
  /** The value reported when this option is checked. */
  value: string;
  /** The text shown beside the square mark. */
  label: string;
  /** Prevents this option from receiving focus or being checked through input. */
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** The choices shown in the group. */
  options: readonly RadioGroupOption[];
  /** The checked value in controlled use, or null for uncontrolled use. */
  value: string | null;
  /** The initially checked value in uncontrolled use. */
  defaultValue: string;
  /** The accessible name and visible heading for the group. */
  label: string;
  /** Blocks input and removes the group from the tab order. */
  disabled: boolean;
}

export interface RadioGroupEvents {
  /** A user checked an option with the keyboard or pointer. */
  valueChange: string;
}

export const defaults: RadioGroupProps = {
  options: [
    { value: "paper", label: "Paper on ink" },
    { value: "ink", label: "Ink on paper" },
    { value: "system", label: "System" },
  ],
  value: null,
  defaultValue: "paper",
  label: "Theme",
  disabled: false,
};

function radioGroupNode<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  return node;
}

function radioGroupRules(selector: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `:where(${selector}){box-sizing:border-box;display:block;min-height:min-content;color:${fg}}`,
    `${selector} [data-pica-content]{box-sizing:border-box;display:grid;width:min(100%,32rem);margin-inline:auto;gap:0.35em;padding:1em}`,
    `${selector} [data-pica-group-label]{box-sizing:border-box;margin:0 0 0.45em;padding:0 0 0.65em;border-bottom:1px solid color-mix(in srgb, ${fg} 28%, transparent);font-family:${GRID_FONT};font-size:0.75em;line-height:1.2;letter-spacing:0.04em;text-transform:uppercase}`,
    `${selector} [data-pica-radio]{box-sizing:border-box;display:flex;align-items:center;gap:0.75em;min-height:2.75em;padding:0.65em 0.75em;line-height:1.35;cursor:pointer;user-select:none}`,
    `${selector} [data-pica-radio]:hover:not([aria-disabled="true"]){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} [data-pica-radio]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-pica-radio][aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    `${selector} [data-pica-mark]{box-sizing:border-box;display:grid;place-items:center;width:1em;height:1em;flex:0 0 1em;border:1px solid ${fg}}`,
    `${selector} [data-pica-fill]{width:0.5em;height:0.5em;background:${accent};opacity:0}`,
    `${selector} [aria-checked="true"] [data-pica-fill]{opacity:1}`,
  ].join("\n");
}

export const mount: Mount<RadioGroupProps> = (host, initial = {}) => {
  let props: RadioGroupProps = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  const emit = emitter<RadioGroupEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const content = radioGroupNode("div");
  content.setAttribute("data-pica-content", "");
  host.append(content);
  let radios: HTMLElement[] = [];

  function selectedIndex(): number {
    const selected = props.value === null ? internalValue : props.value;
    return props.options.findIndex((option) => option.value === selected);
  }

  function firstEnabled(): number {
    return props.options.findIndex((option) => !option.disabled);
  }

  function applyState(): void {
    const checked = selectedIndex();
    const tabStop = checked >= 0 ? checked : firstEnabled();
    for (let index = 0; index < radios.length; index++) {
      const radio = radios[index];
      const option = props.options[index];
      if (!radio || !option) continue;
      radio.setAttribute("aria-checked", index === checked ? "true" : "false");
      radio.setAttribute("aria-disabled", props.disabled || option.disabled ? "true" : "false");
      radio.tabIndex = !props.disabled && index === tabStop ? 0 : -1;
    }
  }

  function render(): void {
    const heading = radioGroupNode("div");
    heading.setAttribute("data-pica-group-label", "");
    heading.setAttribute("aria-hidden", "true");
    heading.textContent = props.label;
    heading.hidden = props.label.length === 0;
    const nextRadios: HTMLElement[] = [];
    const fragment = document.createDocumentFragment();
    fragment.append(heading);
    for (const option of props.options) {
      const radio = radioGroupNode("div");
      radio.setAttribute("data-pica-radio", "");
      radio.setAttribute("data-pica-value", option.value);
      radio.setAttribute("role", "radio");
      const mark = radioGroupNode("span");
      mark.setAttribute("data-pica-mark", "");
      mark.setAttribute("aria-hidden", "true");
      const fill = radioGroupNode("span");
      fill.setAttribute("data-pica-fill", "");
      const text = radioGroupNode("span");
      text.textContent = option.label;
      mark.append(fill);
      radio.append(mark, text);
      fragment.append(radio);
      nextRadios.push(radio);
    }
    content.replaceChildren(fragment);
    radios = nextRadios;
    applyState();
  }

  function nextEnabled(from: number, direction: 1 | -1): number {
    const count = props.options.length;
    for (let step = 1; step <= count; step++) {
      const index = (from + direction * step + count) % count;
      if (!props.options[index]?.disabled) return index;
    }
    return -1;
  }

  function check(index: number): void {
    const option = props.options[index];
    const radio = radios[index];
    if (!option || !radio || props.disabled || option.disabled) return;
    const before = props.value === null ? internalValue : props.value;
    if (props.value === null) {
      internalValue = option.value;
      applyState();
    }
    radio.focus();
    if (before !== option.value) emit("valueChange", option.value);
  }

  const radioFromEvent = (event: Event): number => {
    const target = event.target;
    if (!(target instanceof Element)) return -1;
    const radio = target.closest<HTMLElement>("[data-pica-radio]");
    return radio ? radios.indexOf(radio) : -1;
  };

  const onClick = (event: MouseEvent): void => {
    const index = radioFromEvent(event);
    if (index >= 0) check(index);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const index = radioFromEvent(event);
    if (index < 0 || props.disabled) return;
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      check(index);
      return;
    }
    let direction: 1 | -1 | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") direction = 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") direction = -1;
    if (direction === null) return;
    event.preventDefault();
    const next = nextEnabled(index, direction);
    if (next >= 0) check(next);
  };

  attrs.set("role", "radiogroup");
  attrs.set("aria-label", props.label);
  attrs.set("aria-disabled", props.disabled ? "true" : null);
  sheet.setRules(radioGroupRules(sheet.selector));
  content.addEventListener("click", onClick);
  content.addEventListener("keydown", onKeyDown);
  render();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const previous = props;
      props = { ...props, ...next };
      if (previous.value !== null && props.value === null) internalValue = previous.value;
      attrs.set("aria-label", props.label);
      attrs.set("aria-disabled", props.disabled ? "true" : null);
      if (!sameJson(previous.options, props.options) || previous.label !== props.label) render();
      else applyState();
    },
    destroy() {
      content.removeEventListener("click", onClick);
      content.removeEventListener("keydown", onKeyDown);
      content.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
