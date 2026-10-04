import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface TimecodeEditorProps {
  /** Nominal frames per second, rounded and clamped to 1–120; counting is non-drop. */
  fps: number;
  /** Total frame count; null uses internal state. Changing fps reformats the same frame count. */
  value: number | null;
  /** Initial total frame count, read once when mounted in uncontrolled mode. */
  defaultValue: number;
  /** Visible and accessible name of the grouped timecode editor; empty hides it from assistive technology. */
  label: string;
  /** Disable all four native inputs. */
  disabled: boolean;
}

export interface TimecodeEditorEvents {
  /** New total frame count, emitted only after a user commits or steps a segment. */
  valueChange: number;
}

export const defaults: TimecodeEditorProps = {
  fps: 24,
  value: null,
  defaultValue: 2009,
  label: "Timecode",
  disabled: false,
};

const TIMECODE_NAMES = ["hours", "minutes", "seconds", "frames"] as const;
const TIMECODE_CAPTIONS = ["HH", "MM", "SS", "FF"] as const;

function timecodeRate(value: number): number {
  return Math.min(120, Math.max(1, Math.round(Number.isFinite(value) ? value : 24)));
}

function timecodeClamp(value: number, rate: number): number {
  return Math.min(100 * 3600 * rate - 1, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));
}

function timecodeParts(value: number, rate: number): [number, number, number, number] {
  const frames = timecodeClamp(value, rate);
  const seconds = Math.floor(frames / rate);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60, frames % rate];
}

function timecodePart<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", name);
  return node;
}

function timecodeRules(selector: string): string {
  const part = (name: string): string => `${selector} [data-part="${name}"]`;
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const input = `${selector} input`;
  return [
    `${selector}{display:inline-block;max-width:100%;vertical-align:middle;color:${fg}}`,
    `${part("root")}{display:grid;gap:0.55em;max-width:100%;line-height:1.2}`,
    `${part("heading")}{display:flex;align-items:baseline;justify-content:space-between;gap:1em}`,
    `${part("label")}{font:inherit;font-size:0.8em}`,
    `${part("rate")}{font-family:${GRID_FONT};font-size:0.65em;color:${muted};white-space:nowrap}`,
    `${part("segments")}{display:flex;align-items:center;gap:0.22em;box-sizing:border-box;max-width:100%;padding:0.65em 0.7em;border:1px solid color-mix(in srgb,${fg} 30%,transparent);background:${cssVar("bg")}}`,
    `${part("field")}{display:grid;justify-items:center;gap:0.4em;min-width:0}`,
    `${part("caption")}{font-family:${GRID_FONT};font-size:0.6em;letter-spacing:0.08em;color:${muted}}`,
    `${part("separator")}{font-family:${GRID_FONT};font-size:1.35em;padding-top:0.65em;color:${muted};user-select:none}`,
    `${input}{box-sizing:content-box;width:2ch;min-width:0;margin:0;padding:0.22em 0.3em;font-family:${GRID_FONT};font-size:1.4em;font-variant-numeric:tabular-nums;font-weight:500;line-height:1.2;text-align:center;color:${fg};background:transparent;border:0;border-bottom:2px solid color-mix(in srgb,${fg} 25%,transparent);border-radius:0;appearance:textfield;-moz-appearance:textfield;caret-color:${fg}}`,
    `${part("frames")}{border-bottom-color:${accent}}`,
    `${input}::-webkit-inner-spin-button,${input}::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`,
    `${input}:hover:not(:disabled){background:color-mix(in srgb,${fg} 7%,transparent)}`,
    `${input}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${input}:invalid{box-shadow:none}`,
    `${input}:disabled{cursor:not-allowed;color:${muted}}`,
    `${part("help")}{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}`,
  ].join("\n");
}

export const mount: Mount<TimecodeEditorProps> = (host, initial = {}) => {
  let props: TimecodeEditorProps = { ...defaults, ...initial };
  let current = timecodeClamp(props.defaultValue, timecodeRate(props.fps));
  let alive = true;
  let draft: HTMLInputElement | null = null;
  const emit = emitter<TimecodeEditorEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  sheet.setRules(timecodeRules(sheet.selector));
  const abort = new AbortController();
  const on = { signal: abort.signal };
  const root = timecodePart("div", "root");
  const heading = timecodePart("div", "heading");
  const label = timecodePart("span", "label");
  const rateLabel = timecodePart("span", "rate");
  const segments = timecodePart("div", "segments");
  const help = timecodePart("span", "help");
  help.id = nextId("timecode-help");
  help.textContent = "Non-drop timecode, hours through frames. Up and Down step the focused segment with carrying; Shift or Page keys step ten. Left and Right move between segments. Enter commits, Escape cancels, and pasting HH:MM:SS:FF sets the whole timecode. Range: zero through 99 hours, 59 minutes, 59 seconds and the last frame.";
  const inputs = TIMECODE_NAMES.map((name, index) => {
    const field = timecodePart("label", "field");
    const caption = timecodePart("span", "caption");
    caption.textContent = TIMECODE_CAPTIONS[index] ?? name;
    const input = timecodePart("input", name);
    input.type = "number";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.step = "1";
    input.min = "0";
    field.append(caption, input);
    if (index > 0) {
      const separator = timecodePart("span", "separator");
      separator.textContent = ":";
      separator.setAttribute("aria-hidden", "true");
      segments.append(separator);
    }
    segments.append(field);
    return input;
  });
  heading.append(label, rateLabel);
  root.append(heading, segments, help);
  host.append(root);

  function rate(): number { return timecodeRate(props.fps); }
  function shown(): number { return timecodeClamp(props.value === null ? current : props.value, rate()); }
  function weights(): readonly [number, number, number, number] { return [3600 * rate(), 60 * rate(), rate(), 1]; }
  function limits(): readonly [number, number, number, number] { return [99, 59, 59, rate() - 1]; }

  function configure(): void {
    const title = props.label.trim();
    label.textContent = props.label;
    label.hidden = !title;
    rateLabel.textContent = `${rate()} FPS`;
    attrs.set("role", title ? "group" : null);
    attrs.set("aria-label", title || null);
    attrs.set("aria-hidden", title ? null : "true");
    attrs.set("aria-describedby", title ? help.id : null);
    inputs.forEach((input, index) => {
      input.max = String((limits()[index] ?? 0));
      input.disabled = props.disabled;
      input.setAttribute("aria-label", `${title || "Timecode"} ${TIMECODE_NAMES[index]}`);
      input.setAttribute("aria-describedby", help.id);
      input.style.width = index === 3 && rate() > 100 ? "3ch" : "2ch";
    });
  }

  function paint(): void {
    const parts = timecodeParts(shown(), rate());
    inputs.forEach((input, index) => {
      if (input === draft) return;
      const width = index === 3 && rate() > 100 ? 3 : 2;
      const text = String((parts[index] ?? 0)).padStart(width, "0");
      if (input.value !== text) input.value = text;
    });
    attrs.set("data-pica-ready", "true");
  }

  function choose(raw: number): void {
    const next = timecodeClamp(raw, rate());
    const moved = next !== shown();
    if (moved && props.value === null) current = next;
    draft = null;
    paint();
    if (moved) emit("valueChange", next);
  }

  function edited(input: HTMLInputElement, index: number): number {
    const displayed = input.valueAsNumber;
    if (!Number.isFinite(displayed)) return shown();
    const parts = timecodeParts(shown(), rate());
    return shown() + (Math.round(displayed) - (parts[index] ?? 0)) * (weights()[index] ?? 1);
  }

  function commit(input: HTMLInputElement): void {
    const index = inputs.indexOf(input);
    if (index < 0) return;
    choose(edited(input, index));
  }

  const onInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (inputs.includes(input)) draft = input;
  };
  const onChange = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (!props.disabled && inputs.includes(input)) commit(input);
  };
  const onBlur = (event: FocusEvent): void => {
    const input = event.target as HTMLInputElement;
    if (draft === input && !props.disabled) commit(input);
  };
  const onKey = (event: KeyboardEvent): void => {
    const input = event.target as HTMLInputElement;
    const index = inputs.indexOf(input);
    if (index < 0 || props.disabled || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Enter") { event.preventDefault(); commit(input); return; }
    if (event.key === "Escape") { event.preventDefault(); draft = null; paint(); return; }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (draft === input) commit(input);
      inputs[Math.max(0, Math.min(3, index + (event.key === "ArrowRight" ? 1 : -1)))]?.focus();
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const parts = timecodeParts(shown(), rate());
      choose(shown() + ((event.key === "Home" ? 0 : (limits()[index] ?? 0)) - (parts[index] ?? 0)) * (weights()[index] ?? 1));
      return;
    }
    const sign = event.key === "ArrowUp" || event.key === "PageUp" ? 1 : event.key === "ArrowDown" || event.key === "PageDown" ? -1 : 0;
    if (!sign) return;
    event.preventDefault();
    const jump = event.shiftKey || event.key.startsWith("Page") ? 10 : 1;
    choose((draft === input ? edited(input, index) : shown()) + sign * jump * (weights()[index] ?? 1));
  };
  const onPaste = (event: ClipboardEvent): void => {
    if (props.disabled || !inputs.includes(event.target as HTMLInputElement)) return;
    const text = event.clipboardData?.getData("text") ?? "";
    const match = /^\s*(\d{1,2}):(\d{1,2}):(\d{1,2}):(\d{1,3})\s*$/.exec(text);
    if (!match) return;
    event.preventDefault();
    choose(((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * rate() + Number(match[4]));
  };
  segments.addEventListener("input", onInput, on);
  segments.addEventListener("change", onChange, on);
  segments.addEventListener("focusout", onBlur, on);
  segments.addEventListener("keydown", onKey, on);
  segments.addEventListener("paste", onPaste, on);
  configure();
  paint();

  return {
    update(partial) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...partial };
      if (before.fps !== props.fps) current = timecodeClamp(current, rate());
      if (before.value !== props.value || before.fps !== props.fps || before.disabled !== props.disabled) draft = null;
      if (before.fps !== props.fps || before.label !== props.label || before.disabled !== props.disabled) configure();
      paint();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      abort.abort();
      root.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};
