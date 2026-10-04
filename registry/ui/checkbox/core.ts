import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CheckboxProps {
  /** The controlled state. Null uses the state read from defaultChecked at mount. */
  checked: boolean | "mixed" | null;
  /** The initial state when checked is null. */
  defaultChecked: boolean | "mixed";
  /** Text shown beside the box and used as its accessible name. */
  label: string;
  /** Blocks input and dims the checkbox. */
  disabled: boolean;
}

export interface CheckboxEvents {
  /** The state requested by pointer or keyboard input. */
  checkedChange: "checked" | "unchecked" | "mixed";
}

export const defaults: CheckboxProps = {
  checked: null,
  defaultChecked: true,
  label: "Include archived builds",
  disabled: false,
};

type CheckboxState = boolean | "mixed";

/** Scoped rules for the row, its hairline box, and its glyph. */
function checkboxRules(selector: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${selector}{appearance:none;margin:0;padding:0;border:0;background:transparent;color:${fg};font:inherit;line-height:1.2;display:inline-block;white-space:nowrap;cursor:pointer;user-select:none;outline:none}`,
    `${selector} [data-pica-box]{box-sizing:border-box;width:1.1em;height:1.1em;display:inline-grid;place-items:center;vertical-align:-0.15em;margin-inline-end:0.65em;border:1px solid ${fg};border-radius:0;background:transparent}`,
    `${selector} [data-pica-mark]{color:${accent};font-family:${GRID_FONT};font-size:0.82em;line-height:1}`,
    `${selector} [data-pica-label]:empty{display:none}`,
    `${selector}:hover:not([aria-disabled="true"]) [data-pica-box]{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector}:focus-visible [data-pica-box]{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector}[aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
  ].join("\n");
}

/** The state as an ARIA value. */
function ariaState(state: CheckboxState): string {
  return state === "mixed" ? "mixed" : String(state);
}

/** The event value for a checkbox state. */
function eventState(state: CheckboxState): CheckboxEvents["checkedChange"] {
  if (state === "mixed") return "mixed";
  return state ? "checked" : "unchecked";
}

/** Accepts the event spelling when a generic controlled-state adapter echoes it back. */
function controlledState(value: CheckboxProps["checked"] | CheckboxEvents["checkedChange"]): CheckboxState | null {
  if (value === "checked") return true;
  if (value === "unchecked") return false;
  return value;
}

export const mount: Mount<CheckboxProps> = (host, initial = {}) => {
  let props: CheckboxProps = { ...defaults, ...initial };
  let local: CheckboxState = props.defaultChecked;
  const emit = emitter<CheckboxEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const box = document.createElement("span");
  const mark = document.createElement("span");
  const label = document.createElement("span");

  box.setAttribute("data-pica", "");
  box.setAttribute("data-pica-box", "");
  box.setAttribute("aria-hidden", "true");
  mark.setAttribute("data-pica", "");
  mark.setAttribute("data-pica-mark", "");
  label.setAttribute("data-pica", "");
  label.setAttribute("data-pica-label", "");
  box.append(mark);
  host.append(box, label);

  const state = (): CheckboxState => controlledState(props.checked) ?? local;

  function draw(): void {
    const current = state();
    attrs.set("aria-checked", ariaState(current));
    mark.textContent = current === "mixed" ? "─" : current ? "✓" : "";
    label.textContent = props.label;
    box.style.marginInlineEnd = props.label ? "0.65em" : "0";
  }

  function apply(): void {
    attrs.set("role", "checkbox");
    attrs.set("tabindex", "0");
    attrs.set("aria-label", props.label || "Checkbox");
    attrs.set("aria-disabled", props.disabled ? "true" : null);
    sheet.setRules(checkboxRules(sheet.selector));
    draw();
  }

  function toggle(): void {
    if (props.disabled) return;
    const current = state();
    const next = current === "mixed" ? true : !current;
    if (props.checked === null) {
      local = next;
      draw();
    }
    emit("checkedChange", eventState(next));
  }

  const onClick = (): void => toggle();
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== " " && event.key !== "Spacebar") return;
    event.preventDefault();
    toggle();
  };
  host.addEventListener("click", onClick);
  host.addEventListener("keydown", onKeyDown);

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      host.removeEventListener("click", onClick);
      host.removeEventListener("keydown", onKeyDown);
      box.remove();
      label.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
