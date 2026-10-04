import { emitter } from "../../../lib/events";
import { hostAttributes, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

/** One choice in the segmented control. */
export interface SegmentedControlOption {
  /** The value reported when this option is chosen. */
  value: string;
  /** The text shown in the segment. */
  label: string;
  /** Removes the option from keyboard and pointer choice, and dims it. */
  disabled: boolean;
}

export interface SegmentedControlProps {
  /** The choices shown in the ruled strip, in order. */
  options: readonly SegmentedControlOption[];
  /** The checked value. Null means uncontrolled, so the component tracks its own choice. */
  value: string | null;
  /** The value checked at mount, read once, while value is null. */
  defaultValue: string;
  /** The radio group's accessible name. */
  label: string;
  /** Blocks input and dims every segment. */
  disabled: boolean;
}

export interface SegmentedControlEvents {
  /** The value of the segment the user checked. */
  valueChange: string;
}

export const defaults: SegmentedControlProps = {
  options: [
    { value: "grid", label: "Grid", disabled: false },
    { value: "list", label: "List", disabled: false },
    { value: "board", label: "Board", disabled: false },
  ],
  value: null,
  defaultValue: "grid",
  label: "View",
  disabled: false,
};

/** One ruled strip. The checked segment keeps its foreground label and gains only a two-pixel accent rule. */
function rules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${s}{display:inline-flex;align-items:stretch;margin:0;border:1px solid ${fg};border-radius:0;color:${fg};background:transparent}`,
    `${s} > [role="radio"]{appearance:none;position:relative;margin:0;padding:0.6em 1.1em;border:0;border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1.2;white-space:nowrap;cursor:pointer}`,
    `${s} > [role="radio"] + [role="radio"]{border-left:1px solid color-mix(in srgb, ${fg} 35%, transparent)}`,
    `${s} > [role="radio"][aria-checked="true"]{box-shadow:inset 0 -2px 0 ${accent}}`,
    `${s} > [role="radio"]:hover:not(:disabled):not([aria-checked="true"]){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} > [role="radio"]:focus-visible{z-index:1;outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [role="radio"]:disabled{opacity:0.45;cursor:not-allowed}`,
  ].join("\n");
}

/** A segment button and the value it checks. */
interface SegmentEntry {
  value: string;
  disabled: boolean;
  button: HTMLButtonElement;
}

export const mount: Mount<SegmentedControlProps> = (host, initial = {}) => {
  let props: SegmentedControlProps = { ...defaults, ...initial };
  let internal = props.defaultValue;
  let previousOptions: readonly SegmentedControlOption[] | null = null;
  let entries: SegmentEntry[] = [];

  const emit = emitter<SegmentedControlEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  sheet.setRules(rules(sheet.selector));

  function enabledEntries(): SegmentEntry[] {
    return entries.filter((entry) => !entry.disabled && !props.disabled);
  }

  function effectiveValue(): string {
    return props.value !== null ? props.value : internal;
  }

  function checkedEntry(): SegmentEntry | undefined {
    const value = effectiveValue();
    return entries.find((entry) => entry.value === value && !entry.disabled);
  }

  function choose(entry: SegmentEntry): void {
    if (props.disabled || entry.disabled) return;
    entry.button.focus();
    if (entry.value === effectiveValue()) return;
    if (props.value === null) internal = entry.value;
    emit("valueChange", entry.value);
    apply();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (props.disabled) return;
    const enabled = enabledEntries();
    if (enabled.length === 0) return;
    const at = enabled.findIndex((entry) => entry.button === document.activeElement);
    let target: SegmentEntry | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      target = enabled[(at + 1 + enabled.length) % enabled.length];
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      target = enabled[(at - 1 + enabled.length) % enabled.length];
    } else {
      return;
    }
    event.preventDefault();
    if (target) choose(target);
  }
  host.addEventListener("keydown", onKeydown);

  function rebuildIfNeeded(): void {
    if (previousOptions !== null && sameJson(props.options, previousOptions)) return;
    previousOptions = props.options;
    for (const entry of entries) entry.button.remove();
    entries = props.options.map((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "radio");
      button.setAttribute("data-pica", "");
      button.textContent = option.label;
      button.addEventListener("click", () => choose(entry));
      const entry: SegmentEntry = { value: option.value, disabled: option.disabled, button };
      host.append(button);
      return entry;
    });
  }

  function apply(): void {
    rebuildIfNeeded();
    const checked = checkedEntry();
    if (props.value === null && !checked) {
      internal = enabledEntries()[0]?.value ?? "";
    }
    const resolved = checkedEntry();
    const tabStop = resolved ?? enabledEntries()[0];
    attrs.set("role", "radiogroup");
    attrs.set("aria-label", props.label || null);
    attrs.set("aria-disabled", props.disabled ? "true" : null);
    entries.forEach((entry) => {
      entry.button.disabled = props.disabled || entry.disabled;
      entry.button.setAttribute("aria-checked", entry === resolved ? "true" : "false");
      entry.button.tabIndex = !props.disabled && entry === tabStop ? 0 : -1;
    });
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      host.removeEventListener("keydown", onKeydown);
      for (const entry of entries) entry.button.remove();
      entries = [];
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
