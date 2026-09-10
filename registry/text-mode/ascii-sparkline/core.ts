import { labelHost, unlabelHost } from "../../../lib/a11y";
import { braille, brailleDot, lowerEighth } from "../../../lib/blocks";
import { GRID_FONT } from "../../../lib/font";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AsciiSparklineProps {
  /** Series to plot, in order. Values that are not finite numbers are skipped. */
  values: number[];
  /** "blocks" draws one eighth-block bar per cell. "braille" draws a higher-resolution line, two values per cell. */
  mode: "blocks" | "braille";
  /** Cells to draw. 0 fits one cell per value in blocks mode, or one cell per two values in braille mode. A positive width resamples the series to that many cells. */
  width: number;
  /** Value mapped to the bottom of the range. Null reads the series' own minimum. */
  min: number | null;
  /** Value mapped to the top of the range. Null reads the series' own maximum. */
  max: number | null;
  /** Name for the series, read by assistive technology before its size, range, and latest value. */
  label: string;
  /** CSS font-family stack. Must be monospace. */
  fontFamily: string;
}

export const defaults: AsciiSparklineProps = {
  values: [
    3.1, 3.5, 3.3, 3.9, 4.4, 4.1, 4.7, 5.2, 4.9, 5.5, 6.1, 5.8,
    6.4, 7.0, 6.7, 7.3, 7.9, 8.4, 9.1, 9.8, 9.3, 8.6, 7.9, 7.2,
  ],
  mode: "blocks",
  width: 0,
  min: null,
  max: null,
  label: "trend",
  fontFamily: GRID_FONT,
};

/** Resamples `source` to `count` points by linear interpolation along its index. */
function resample(source: readonly number[], count: number): number[] {
  const last = source.length - 1;
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? (i * last) / (count - 1) : 0;
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, last);
    const frac = t - lo;
    out[i] = (source[lo] ?? 0) * (1 - frac) + (source[hi] ?? 0) * frac;
  }
  return out;
}

/** The text for one clean series: eighth-block bars, or a braille line at 2 by 4 dots per cell. */
function render(props: AsciiSparklineProps, clean: readonly number[]): string {
  if (clean.length === 0) return "";
  const lo = props.min ?? Math.min(...clean);
  const hi = props.max ?? Math.max(...clean);
  const span = hi - lo;
  // A flat series, or explicit bounds with no span, reads as the middle of the ramp rather than full.
  const scale = (v: number): number => (span > 0 ? Math.min(1, Math.max(0, (v - lo) / span)) : 0.5);

  if (props.mode === "braille") {
    const cells = props.width > 0 ? props.width : Math.ceil(clean.length / 2);
    const dots = resample(clean, cells * 2);
    let text = "";
    for (let c = 0; c < cells; c++) {
      let bits = 0;
      for (let col = 0; col < 2; col++) {
        const t = scale(dots[c * 2 + col] ?? lo);
        const row = Math.min(3, Math.max(0, Math.round((1 - t) * 3)));
        bits |= brailleDot(row, col);
      }
      text += braille(bits);
    }
    return text;
  }

  const cells = props.width > 0 ? props.width : clean.length;
  let text = "";
  for (const v of resample(clean, cells)) {
    const level = Math.min(7, Math.max(0, Math.round(scale(v) * 7)));
    text += lowerEighth(level + 1);
  }
  return text;
}

/** One decimal place, without a trailing zero. */
function short(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/** The label assistive technology reads: the series' name, size, range, and latest value. */
function describe(props: AsciiSparklineProps, clean: readonly number[]): string {
  if (clean.length === 0) return `${props.label}: no data`;
  const lo = props.min ?? Math.min(...clean);
  const hi = props.max ?? Math.max(...clean);
  const last = clean[clean.length - 1] ?? 0;
  const unit = clean.length === 1 ? "value" : "values";
  return `${props.label}: ${clean.length} ${unit} from ${short(lo)} to ${short(hi)}, last ${short(last)}`;
}

export const mount: Mount<AsciiSparklineProps> = (host, initial = {}) => {
  let props: AsciiSparklineProps = { ...defaults, ...initial };
  const view = document.createElement("span");
  view.setAttribute("data-pica", "");
  view.setAttribute("aria-hidden", "true");
  view.style.whiteSpace = "nowrap";
  view.style.userSelect = "none";
  view.style.pointerEvents = "none";
  view.style.color = cssVar("fg");
  host.appendChild(view);

  function draw(): void {
    const clean = props.values.filter((v) => Number.isFinite(v));
    view.style.fontFamily = props.fontFamily;
    view.textContent = render(props, clean);
    labelHost(host, describe(props, clean));
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      view.remove();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
