import { braille, brailleDot } from "../../../lib/blocks";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ButtonProps {
  /** The look: "solid" fills with the accent, "outline" draws a hairline, "ghost" shows only on hover, and "brackets" sets the label in monospace between square brackets. */
  variant: "solid" | "outline" | "ghost" | "brackets";
  /** Size relative to the surrounding text. */
  size: "sm" | "md" | "lg";
  /** What the button does inside a form. */
  type: "button" | "submit" | "reset";
  /** Blocks input and dims the button. It also leaves the tab order, as a disabled button does. */
  disabled: boolean;
  /** Shows a braille spinner before the label and ignores presses until it is turned off. It stays focusable. */
  loading: boolean;
}

export interface ButtonEvents {
  /** The button was activated by a click, Enter, or Space while enabled and not loading. */
  press: null;
}

export const defaults: ButtonProps = {
  variant: "solid",
  size: "md",
  type: "button",
  disabled: false,
  loading: false,
};

/** A single braille dot's path around the cell, clockwise from the top left. */
const ORBIT: readonly (readonly [number, number])[] = [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 0], [2, 0], [1, 0]];
/** Milliseconds per spinner step. */
const STEP_MS = 90;

/** The spinner at time `t`: three dots chasing each other around the braille cell. */
function spinnerGlyph(t: number): string {
  const step = Math.floor(t / STEP_MS);
  let bits = 0;
  for (let k = 0; k < 3; k++) {
    const [row, col] = ORBIT[(((step - k) % ORBIT.length) + ORBIT.length) % ORBIT.length] ?? [0, 0];
    bits |= brailleDot(row, col);
  }
  return braille(bits);
}

const PADDING: Readonly<Record<ButtonProps["size"], string>> = { sm: "0.3em 0.7em", md: "0.45em 0.95em", lg: "0.6em 1.2em" };
const FONT_SIZE: Readonly<Record<ButtonProps["size"], string>> = { sm: "0.875em", md: "1em", lg: "1.125em" };

/** The scoped rules for one button. The type follows the page; only the brackets look is monospace. */
function rules(s: string, p: ButtonProps): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const look: Record<ButtonProps["variant"], string[]> = {
    solid: [`background:${accent}`, `color:${cssOn("accent")}`],
    outline: ["background:transparent", `color:${fg}`, `border-color:${fg}`],
    ghost: ["background:transparent", `color:${fg}`],
    brackets: ["background:transparent", `color:${fg}`, `font-family:${GRID_FONT}`, "padding-inline:0.2em"],
  };
  const hover: Record<ButtonProps["variant"], string> = {
    solid: `background:color-mix(in srgb, ${accent} 85%, ${fg})`,
    outline: `background:color-mix(in srgb, ${fg} 10%, transparent)`,
    ghost: `background:color-mix(in srgb, ${fg} 10%, transparent)`,
    brackets: `color:${accent}`,
  };
  const base = [
    "appearance:none",
    "margin:0",
    "font:inherit",
    `font-size:${FONT_SIZE[p.size]}`,
    "line-height:1.2",
    `padding:${PADDING[p.size]}`,
    "display:inline-flex",
    "align-items:center",
    "gap:0.5em",
    "border:1px solid transparent",
    // Square, as STYLE.md asks of everything a component draws; this also clears the platform's own rounding.
    "border-radius:0",
    "cursor:pointer",
  ];
  return [
    `${s}{${[...base, ...look[p.variant]].join(";")}}`,
    `${s}:hover:not(:disabled):not([aria-disabled="true"]){${hover[p.variant]}}`,
    `${s}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s}:disabled,${s}[aria-disabled="true"]{opacity:0.45;cursor:not-allowed}`,
    ...(p.variant === "brackets" ? [`${s}::before{content:"["}`, `${s}::after{content:"]"}`] : []),
  ].join("\n");
}

export const mount: Mount<ButtonProps> = (host, initial = {}) => {
  let props: ButtonProps = { ...defaults, ...initial };
  const emit = emitter<ButtonEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const spinner = document.createElement("span");
  spinner.setAttribute("data-pica", "");
  spinner.setAttribute("aria-hidden", "true");

  const loop = createLoop({
    el: host,
    fps: 12,
    paused: !props.loading,
    time: null,
    still: 0,
    frame: (t) => {
      spinner.textContent = spinnerGlyph(t);
    },
  });

  // A native button already turns Enter and Space into a click, so one listener covers every input.
  const onClick = (): void => {
    if (!props.disabled && !props.loading) emit("press", null);
  };
  host.addEventListener("click", onClick);

  function apply(): void {
    attrs.set("type", props.type);
    attrs.set("disabled", props.disabled ? "" : null);
    attrs.set("aria-busy", props.loading ? "true" : null);
    attrs.set("aria-disabled", props.loading ? "true" : null);
    sheet.setRules(rules(sheet.selector, props));
    if (props.loading && !spinner.isConnected) host.prepend(spinner);
    if (!props.loading && spinner.isConnected) spinner.remove();
    loop.update({ paused: !props.loading });
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      loop.destroy();
      host.removeEventListener("click", onClick);
      spinner.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
