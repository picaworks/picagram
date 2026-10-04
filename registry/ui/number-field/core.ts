import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope, styleHost } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface NumberFieldProps {
  /** The current number. Null lets the field manage its own value. */
  value: number | null;
  /** The number shown initially when value is null. */
  defaultValue: number;
  /** The smallest value the field accepts. */
  min: number;
  /** The largest value the field accepts. */
  max: number;
  /** The amount added or subtracted by the arrow keys and stepper buttons. */
  step: number;
  /** The amount added or subtracted by Page Up and Page Down. */
  largeStep: number;
  /** The visible name of the field. */
  label: string;
  /** Blocks input and dims the field. */
  disabled: boolean;
}

export interface NumberFieldEvents {
  /** The user committed a different number. */
  valueChange: number;
}

export const defaults: NumberFieldProps = {
  value: null,
  defaultValue: 8,
  min: 0,
  max: 64,
  step: 1,
  largeStep: 10,
  label: "Columns",
  disabled: false,
};

function limits(props: NumberFieldProps): readonly [number, number] {
  const min = Number.isFinite(props.min) ? props.min : defaults.min;
  const proposedMax = Number.isFinite(props.max) ? props.max : defaults.max;
  return [min, Math.max(min, proposedMax)];
}

function stepSize(step: number): number {
  return Number.isFinite(step) && step > 0 ? step : defaults.step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, props: NumberFieldProps): number {
  const [min, max] = limits(props);
  const step = stepSize(props.step);
  const finite = Number.isFinite(value) ? value : min;
  const stepped = min + Math.round((finite - min) / step) * step;
  return clamp(Number(stepped.toPrecision(12)), min, max);
}

function rules(s: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  return [
    `${s}{max-width:100%;flex-direction:column;gap:0.45em;color:${fg};vertical-align:middle}`,
    `${s} [data-pica-label]{font:inherit;font-size:0.7em;line-height:1;text-transform:uppercase;letter-spacing:0.04em}`,
    `${s} [data-pica-field]{display:grid;grid-template-columns:2.5em minmax(5.5em,8em) 2.5em;border:1px solid ${fg};background:transparent}`,
    `${s} input,${s} button{box-sizing:border-box;border-radius:0;color:${fg}}`,
    `${s} input{grid-column:2;grid-row:1;width:100%;min-width:0;appearance:none;border:0;background:transparent;padding:0.55em 0.7em;font-family:${GRID_FONT};font-size:1em;line-height:1.35;font-variant-numeric:tabular-nums;text-align:right}`,
    `${s} button{grid-row:1;width:2.5em;min-height:2.5em;appearance:none;margin:0;border:0;background:transparent;padding:0;font-family:${GRID_FONT};font-size:1em;line-height:1;cursor:pointer}`,
    `${s} [data-pica-decrement]{grid-column:1;border-right:1px solid ${fg}}`,
    `${s} [data-pica-increment]{grid-column:3;border-left:1px solid ${fg}}`,
    `${s} button:hover:not(:disabled){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} input:focus-visible,${s} button:focus-visible{position:relative;z-index:1;outline:2px solid ${accent};outline-offset:2px}`,
    `${s}[data-pica-disabled="true"]{opacity:0.45}`,
    `${s} :disabled{cursor:not-allowed}`,
  ].join("\n");
}

export const mount: Mount<NumberFieldProps> = (host, initial = {}) => {
  let props: NumberFieldProps = { ...defaults, ...initial };
  const emit = emitter<NumberFieldEvents>(host);
  const sheet = scope(host);
  const restoreHost = styleHost(host, { display: "inline-flex" });
  const id = nextId("pica-number-field");
  const label = document.createElement("label");
  const field = document.createElement("div");
  const input = document.createElement("input");
  const decrement = document.createElement("button");
  const increment = document.createElement("button");
  let current = snap(props.value ?? props.defaultValue, props);

  label.setAttribute("data-pica", "");
  label.setAttribute("data-pica-label", "");
  label.htmlFor = id;
  field.setAttribute("data-pica", "");
  field.setAttribute("data-pica-field", "");
  input.setAttribute("data-pica", "");
  input.id = id;
  input.type = "text";
  input.inputMode = "decimal";
  input.setAttribute("role", "spinbutton");
  decrement.setAttribute("data-pica", "");
  decrement.setAttribute("data-pica-decrement", "");
  decrement.type = "button";
  decrement.textContent = "−";
  increment.setAttribute("data-pica", "");
  increment.setAttribute("data-pica-increment", "");
  increment.type = "button";
  increment.textContent = "+";
  field.append(input, decrement, increment);
  host.append(label, field);
  sheet.setRules(rules(sheet.selector));

  function paint(): void {
    const [min, max] = limits(props);
    input.value = String(current);
    input.setAttribute("aria-valuemin", String(min));
    input.setAttribute("aria-valuemax", String(max));
    input.setAttribute("aria-valuenow", String(current));
    input.disabled = props.disabled;
    decrement.disabled = props.disabled;
    increment.disabled = props.disabled;
    label.textContent = props.label;
    decrement.setAttribute("aria-label", `Decrease ${props.label}`.trim());
    increment.setAttribute("aria-label", `Increase ${props.label}`.trim());
    host.toggleAttribute("data-pica-disabled", props.disabled);
  }

  function commit(proposed: number, edge?: "min" | "max"): void {
    const [min, max] = limits(props);
    const next = edge === "min" ? min : edge === "max" ? max : snap(proposed, props);
    const changed = next !== current;
    if (props.value === null) current = next;
    paint();
    if (changed) emit("valueChange", next);
  }

  function typedValue(): number | null {
    const value = Number(input.value.trim());
    return input.value.trim() && Number.isFinite(value) ? value : null;
  }

  function commitTyped(): void {
    const value = typedValue();
    if (value === null) paint();
    else commit(value);
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    const typed = typedValue() ?? current;
    const large = Number.isFinite(props.largeStep) ? Math.abs(props.largeStep) : defaults.largeStep;
    let proposed: number | null = null;
    let edge: "min" | "max" | undefined;
    if (event.key === "ArrowUp") proposed = typed + stepSize(props.step);
    else if (event.key === "ArrowDown") proposed = typed - stepSize(props.step);
    else if (event.key === "PageUp") proposed = typed + large;
    else if (event.key === "PageDown") proposed = typed - large;
    else if (event.key === "Home") edge = "min";
    else if (event.key === "End") edge = "max";
    else if (event.key === "Enter") proposed = typedValue();
    else return;
    event.preventDefault();
    if (proposed === null && edge === undefined) paint();
    else commit(proposed ?? current, edge);
  };
  const onBlur = (): void => commitTyped();
  const onDecrement = (): void => commit(current - stepSize(props.step));
  const onIncrement = (): void => commit(current + stepSize(props.step));
  input.addEventListener("keydown", onKeyDown);
  input.addEventListener("blur", onBlur);
  decrement.addEventListener("click", onDecrement);
  increment.addEventListener("click", onIncrement);

  paint();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      current = props.value === null ? snap(current, props) : snap(props.value, props);
      paint();
    },
    destroy() {
      input.removeEventListener("keydown", onKeyDown);
      input.removeEventListener("blur", onBlur);
      decrement.removeEventListener("click", onDecrement);
      increment.removeEventListener("click", onIncrement);
      label.remove();
      field.remove();
      sheet.destroy();
      restoreHost();
      delete host.dataset.picaReady;
    },
  };
};
