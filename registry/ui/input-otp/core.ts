import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface InputOtpProps {
  /** The number of character cells, from four through eight. */
  length: number;
  /** The controlled code, or null to let the component keep its own value. */
  value: string | null;
  /** The code used once when the component mounts uncontrolled. */
  defaultValue: string;
  /** The characters accepted from typing and paste. */
  pattern: "numeric" | "alphanumeric";
  /** The accessible name of the group. */
  label: string;
  /** Blocks input and dims the group. */
  disabled: boolean;
}

export interface InputOtpEvents {
  /** The complete code after a cell changes. */
  valueChange: string;
  /** The code after every cell becomes filled. */
  complete: string;
}

export const defaults: InputOtpProps = {
  length: 6,
  value: null,
  defaultValue: "",
  pattern: "numeric",
  label: "One-time code",
  disabled: false,
};

function countFor(length: number): number {
  return Number.isFinite(length) ? Math.max(4, Math.min(8, Math.round(length))) : defaults.length;
}

function accepts(character: string, pattern: InputOtpProps["pattern"]): boolean {
  return pattern === "numeric" ? /^[0-9]$/.test(character) : /^[A-Za-z0-9]$/.test(character);
}

function cellsFor(text: string, count: number, pattern: InputOtpProps["pattern"]): string[] {
  const cells = Array.from({ length: count }, () => "");
  let at = 0;
  for (const character of Array.from(text)) {
    if (accepts(character, pattern) && at < count) cells[at++] = character;
  }
  return cells;
}

function otpRules(selector: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const cell = `${selector} [data-otp-cell]`;
  return [
    `${selector}{display:inline-block}`,
    `${selector} [data-otp-row]{display:flex;gap:0.5em;align-items:center}`,
    `${cell}{appearance:none;box-sizing:border-box;width:2.75em;height:3em;margin:0;padding:0;border:1px solid color-mix(in srgb, ${fg} 42%, transparent);border-radius:0;background:transparent;color:${fg};caret-color:${accent};font-family:${GRID_FONT};font-size:1em;font-variant-numeric:tabular-nums;line-height:1;text-align:center}`,
    `${cell}[data-next="true"]{border-bottom:2px solid ${accent}}`,
    `${cell}:focus{outline:none}`,
    `${cell}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector}[aria-disabled="true"] [data-otp-row]{opacity:0.45}`,
  ].join("\n");
}

export const mount: Mount<InputOtpProps> = (host, initial = {}) => {
  let props: InputOtpProps = { ...defaults, ...initial };
  let count = countFor(props.length);
  let state = cellsFor(props.value ?? props.defaultValue, count, props.pattern);
  let inputs: HTMLInputElement[] = [];
  const emit = emitter<InputOtpEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const row = document.createElement("div");
  row.setAttribute("data-pica", "");
  row.setAttribute("data-otp-row", "");
  host.append(row);

  function shown(): string[] {
    return props.value === null ? [...state] : cellsFor(props.value, count, props.pattern);
  }

  function indexOf(target: EventTarget | null): number {
    return target instanceof HTMLInputElement && row.contains(target) ? inputs.indexOf(target) : -1;
  }

  function render(): void {
    const cells = shown();
    const empty = cells.indexOf("");
    const active = indexOf(document.activeElement);
    const tab = props.disabled ? -1 : active >= 0 ? active : empty >= 0 ? empty : count - 1;
    for (let index = 0; index < inputs.length; index++) {
      const input = inputs[index];
      if (!input) continue;
      input.value = cells[index] ?? "";
      input.tabIndex = index === tab ? 0 : -1;
      input.disabled = props.disabled;
      input.setAttribute("aria-label", `Digit ${index + 1} of ${count}`);
      input.setAttribute("inputmode", props.pattern === "numeric" ? "numeric" : "text");
      input.setAttribute("pattern", props.pattern === "numeric" ? "[0-9]*" : "[A-Za-z0-9]*");
      if (index === empty) input.setAttribute("data-next", "true");
      else input.removeAttribute("data-next");
    }
  }

  function build(): void {
    row.replaceChildren();
    inputs = [];
    for (let index = 0; index < count; index++) {
      const input = document.createElement("input");
      input.setAttribute("data-pica", "");
      input.setAttribute("data-otp-cell", "");
      input.type = "text";
      input.maxLength = 1;
      input.autocomplete = "one-time-code";
      input.spellcheck = false;
      inputs.push(input);
      row.append(input);
    }
  }

  function focusCell(index: number): void {
    inputs[Math.max(0, Math.min(count - 1, index))]?.focus({ preventScroll: true });
  }

  function commit(next: string[], focus: number): void {
    const before = shown().join("");
    const value = next.join("");
    if (props.value === null) state = next;
    render();
    focusCell(focus);
    if (value === before) return;
    emit("valueChange", value);
    if (next.every(Boolean)) emit("complete", value);
  }

  const onFocus = (): void => render();
  const onKey = (event: KeyboardEvent): void => {
    const index = indexOf(event.target);
    if (index < 0) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (event.key === "Home") focusCell(0);
      else if (event.key === "End") focusCell(count - 1);
      else focusCell(index + (event.key === "ArrowLeft" ? -1 : 1));
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = shown();
      const target = next[index] ? index : Math.max(0, index - 1);
      next[target] = "";
      commit(next, target);
      return;
    }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      if (!accepts(event.key, props.pattern)) return;
      const next = shown();
      next[index] = event.key;
      commit(next, Math.min(count - 1, index + 1));
    }
  };

  const onInput = (event: Event): void => {
    const index = indexOf(event.target);
    if (index < 0) return;
    const input = inputs[index];
    if (!input) return;
    const character = Array.from(input.value).findLast((item) => accepts(item, props.pattern)) ?? "";
    const next = shown();
    next[index] = character;
    commit(next, character ? Math.min(count - 1, index + 1) : index);
  };

  const onPaste = (event: ClipboardEvent): void => {
    const index = indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const accepted = Array.from(event.clipboardData?.getData("text") ?? "").filter((item) => accepts(item, props.pattern));
    if (accepted.length === 0) return;
    const next = shown();
    let at = index;
    for (const character of accepted) {
      if (at >= count) break;
      next[at++] = character;
    }
    commit(next, Math.min(count - 1, at));
  };

  row.addEventListener("focusin", onFocus);
  row.addEventListener("keydown", onKey);
  row.addEventListener("input", onInput);
  row.addEventListener("paste", onPaste);

  function apply(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label || null);
    attrs.set("aria-disabled", props.disabled ? "true" : null);
    sheet.setRules(otpRules(sheet.selector));
    render();
  }

  build();
  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const visible = shown();
      const wasControlled = props.value !== null;
      props = { ...props, ...next };
      const nextCount = countFor(props.length);
      const rebuild = nextCount !== count;
      count = nextCount;
      if (props.value !== null) state = cellsFor(props.value, count, props.pattern);
      else if (wasControlled) state = cellsFor(visible.join(""), count, props.pattern);
      else state = cellsFor(state.join(""), count, props.pattern);
      if (rebuild) build();
      apply();
    },
    destroy() {
      row.removeEventListener("focusin", onFocus);
      row.removeEventListener("keydown", onKey);
      row.removeEventListener("input", onInput);
      row.removeEventListener("paste", onPaste);
      row.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
