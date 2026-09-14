import * as glitchText from "../../effects/glitch-text/core";
import * as scanlines from "../../effects/scanlines/core";
import { GRID_FONT } from "../../../lib/font";
import { layer, scope, type Layer } from "../../../lib/host";
import { changed, sameJson } from "../../../lib/json";
import { createLoop } from "../../../lib/loop";
import { cssOn, cssVar } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";

export interface CyberpunkHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface CyberpunkHeroProps extends MotionProps {
  /** The headline, which the composed glitch text tears sideways in rare short bursts. Empty hides it. */
  headline: string;
  /** The line under the headline, set in the page's own font. Empty hides it. */
  subhead: string;
  /** The mono status line above the headline, which a blinking block cursor ends. Empty hides it. */
  kicker: string;
  /** Calls to action, drawn as links. At most three show, and the first fills with the foreground. */
  actions: readonly CyberpunkHeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** Mono readouts stacked in the corners, ticking once a second with the session clock. */
  telemetry: boolean;
  /** The scanline overlay drawn over the whole section, with a slow roll band. */
  scanlines: boolean;
  /** How strongly the scanlines show, from 0 to 1. */
  intensity: number;
}

export const defaults: CyberpunkHeroProps = {
  headline: "Still transmitting.",
  subhead: "The session has been open for 47 days. Every line still answers.",
  kicker: "TERM 09 // UPLINK HELD",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  minHeight: 68,
  telemetry: true,
  scanlines: true,
  intensity: 0.55,
  paused: false,
  time: null,
  seed: 1,
};

/** Corner positions in the order readouts are written: top left, top right, bottom left, bottom right. */
const POSITIONS = ["tl", "tr", "bl", "br"] as const;
/** Which corner's first line carries the one accent figure: the top right, which survives the narrow layout. */
const ACCENT_CORNER = 1;
/** Milliseconds from the start of one headline tear to the start of the next: occasional, seconds apart. */
const TEAR_INTERVAL = 4800;
/** How long one tear lasts. Brief enough that the headline never reads as broken. */
const TEAR_BURST = 240;
/** Frames per second the tearing runs at. One burst draws the same strips on every frame, so a low ceiling
 *  builds each burst once or twice instead of seven times over, with no change in what shows. */
const TEAR_FPS = 8;
/** Milliseconds the roll band takes to cross the full height once before it repeats. */
const ROLL_MS = 14_000;
/** Milliseconds the block cursor spends in each half of one blink. */
const CURSOR_MS = 530;
/** Below this width the bottom corners drop, leaving the top pair, so they never crowd the copy. */
const NARROW = "44rem";
/** Inset for the corner readouts, close to the content padding so the frame reads as one grid. */
const INSET = "clamp(1.1rem, 3.5vw, 3rem)";
/** The roll band's own gradient: transparent above and below a soft ink peak at its center, the same band
 *  the composed overlay drew. Painted once into the band element's own layer, then only moved. */
const ROLL_BAND = `linear-gradient(to bottom, transparent 0%, transparent 38%, ${cssVar("fg")} 50%, transparent 62%, transparent 100%)`;

/** Keeps a 0 to 1 prop inside its range. */
function unit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Keeps minHeight inside a sane range even if a caller passes something outside it. */
function clampVh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Two digits, so the readout's figures never change width as they tick. */
function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

/** A four digit session id in upper case hex. */
function hex4(n: number): string {
  return Math.floor(n).toString(16).toUpperCase().padStart(4, "0").slice(-4);
}

/** The overlay's strength on a restrained range, since most of the frame must stay near the ground. It
 *  lives on the layer that wraps the stripes and the roll band, so one opacity dims both the way the
 *  composed overlay's single element did. */
function scanOpacity(intensity: number): string {
  return (0.05 + unit(intensity) * 0.3).toFixed(3);
}

/** Props for the composed scanlines: the stripes alone, painted once and then never touched. The roll band
 *  is this section's own element instead, moved by a composited transform: sliding background-position
 *  repainted the whole overlay every frame, which was the long task the review measured. */
function scanProps(p: CyberpunkHeroProps): Partial<typeof scanlines.defaults> {
  return { paused: p.paused, time: p.time, seed: p.seed, opacity: 1, roll: false, fps: 6 };
}

/** Props for the composed glitch text: the headline tears rarely and briefly, in the page's own font,
 *  which "inherit" passes down from the heading the layer sits in. */
function tearProps(p: CyberpunkHeroProps): Partial<typeof glitchText.defaults> {
  return { text: p.headline, interval: TEAR_INTERVAL, burst: TEAR_BURST, intensity: 0.6, fontFamily: "inherit", fps: TEAR_FPS, paused: p.paused, time: p.time, seed: p.seed };
}

/** Fake but plausible telemetry, one pair of lines per corner. Everything is a pure function of the seed
 *  and the epoch second: the session id, uptime, and packet count hold their base values while jittered
 *  figures redraw once a second. */
function readouts(seed: number, epoch: number): string[][] {
  const jitter = (lane: number): number => createRng(hashSeed(seed, epoch, lane))();
  const base = createRng(hashSeed(seed, 0, 77));
  const session = Math.floor(base() * 0xffff);
  const up = Math.floor(base() * 4_000_000) + epoch;
  const pkt = 400_000 + Math.floor(base() * 800_000) + epoch * (120 + Math.floor(base() * 300));
  const dd = Math.floor(up / 86400);
  const hh = Math.floor(up / 3600) % 24;
  const mm = Math.floor(up / 60) % 60;
  const ss = up % 60;
  return [
    [`SES ${hex4(session)}`, `UP ${pad2(dd)}:${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`],
    [`SIG ${(93 + jitter(1) * 6).toFixed(1)}`, `DRP ${(jitter(2) * 0.6).toFixed(1)}%`],
    [`PKT ${pkt}`, `RTT ${(8 + jitter(3) * 30).toFixed(0)}MS`],
    [`MEM ${(52 + jitter(4) * 18).toFixed(1)}%`, `TMP ${(36 + jitter(5) * 9).toFixed(1)}°C`],
  ];
}

/** Creates one element the core owns, marked for identification and scoped styling. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Layout for the host, the calls to action, and the corner readouts. The minimum height goes in a
 *  :where() rule, which carries no specificity at all, so a page that gives this host a height of its
 *  own wins without having to fight an inline style. Corners and lines are square, dimmed foreground
 *  mixes rather than the muted token, and the accent appears on exactly one readout figure. */
function rules(s: string, p: CyberpunkHeroProps): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const dim = `color-mix(in srgb, ${fg} 62%, transparent)`;
  const faint = `color-mix(in srgb, ${fg} 60%, transparent)`;
  const hairline = `color-mix(in srgb, ${fg} 42%, transparent)`;
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  return [
    `:where(${s}){min-height:${clampVh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;position:relative;isolation:isolate;display:flex;flex-direction:column;justify-content:center;align-items:${edge};gap:clamp(0.9rem,2.5vh,1.4rem);padding:clamp(3.5rem,9vh,6rem) clamp(1.25rem,5vw,4.5rem);color:${fg};background-color:${bg};overflow-wrap:break-word}`,
    `${s} > :not([data-pica]){margin:0;max-width:44rem;text-align:${textAlign}}`,
    `${s} > [data-pica-head]{display:flex;flex-direction:column;align-items:${edge};gap:0.55em;width:100%;max-width:44rem;text-align:${textAlign}}`,
    `${s} [data-pica-kicker]{margin:0;font-family:${GRID_FONT};font-size:0.72rem;line-height:1.6;letter-spacing:0.12em;text-transform:uppercase;color:${dim}}`,
    `${s} [data-pica-cursor]{display:inline-block;margin-left:0.35em;color:${fg}}`,
    `${s} [data-pica-headline]{margin:0;max-width:100%;font-size:clamp(1.9rem,6vw,4rem);line-height:1.05;font-weight:700;letter-spacing:-0.015em;overflow:hidden}`,
    `${s} [data-pica-subhead]{margin:0;max-width:34rem;font-size:clamp(1rem,1.4vw,1.15rem);line-height:1.55;color:${dim}}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.7em;width:100%;max-width:44rem;justify-content:${edge}}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;text-decoration:none;font-family:${GRID_FONT};font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;line-height:1.2;padding:0.8em 1.3em;display:inline-flex;align-items:center;border:1px solid ${hairline};border-radius:0;color:${fg};background:transparent;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]{color:${fg};background:currentColor;border-color:currentColor}`,
    `${s} > [data-pica-actions] a[data-variant="solid"] > [data-pica-ink]{color:${cssOn("fg")}}`,
    `${s} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, currentColor 85%, transparent)}`,
    `${s} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent);border-color:${fg}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} > [data-pica-corners]{position:absolute;inset:0;z-index:1;pointer-events:none}`,
    `${s} [data-pica-corner]{position:absolute;display:flex;flex-direction:column;gap:0.2em;font-family:${GRID_FONT};font-size:0.62rem;line-height:1.6;letter-spacing:0.08em;font-variant-numeric:tabular-nums;color:${faint};white-space:pre}`,
    `${s} [data-pica-corner][data-pica-pos="tl"]{top:${INSET};left:${INSET}}`,
    `${s} [data-pica-corner][data-pica-pos="tr"]{top:${INSET};right:${INSET};text-align:right;align-items:flex-end}`,
    `${s} [data-pica-corner][data-pica-pos="bl"]{bottom:${INSET};left:${INSET}}`,
    `${s} [data-pica-corner][data-pica-pos="br"]{bottom:${INSET};right:${INSET};text-align:right;align-items:flex-end}`,
    `${s} [data-pica-hot]{color:${accent}}`,
    // The band is twice the host's height, hung so it always covers the frame, and the clock shifts it by
    // a translateY in percent of its own box: half of it is exactly the host's height, which is the shift
    // the old background-position math needed, and a percentage needs no layout read on the frame.
    `${s} [data-pica-band]{position:absolute;top:-100%;left:0;right:0;height:200%;z-index:1;will-change:transform;background-image:${ROLL_BAND};background-size:100% 50%;background-repeat:repeat-y}`,
    `@media (max-width: ${NARROW}){${s} [data-pica-corner][data-pica-pos="bl"],${s} [data-pica-corner][data-pica-pos="br"]{display:none}}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: at most three, the first solid in the foreground, the rest hairline. */
function renderActions(container: HTMLElement, actions: readonly CyberpunkHeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.slice(0, 3).entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    if (i === 0) {
      // The solid link's own color is the fill, painted through currentColor, so the contrast ink has to
      // live on a nested span: cssOn(fg) resolves against the link's color, which is the fill itself.
      const ink = document.createElement("span");
      ink.setAttribute("data-pica", "");
      ink.setAttribute("data-pica-ink", "");
      ink.textContent = action.label;
      a.append(ink);
    } else {
      a.textContent = action.label;
    }
    container.append(a);
  }
}

export const mount: Mount<CyberpunkHeroProps> = (host, initial = {}) => {
  let props: CyberpunkHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);

  // The copy column goes before the page's own children, so the section reads status line, headline,
  // subhead, wrapped content, then the calls to action. Children are never moved or touched.
  const head = part("div", "head");
  const kickerEl = part("p", "kicker");
  const kickerText = document.createTextNode(props.kicker);
  const cursorEl = part("span", "cursor");
  cursorEl.setAttribute("aria-hidden", "true");
  cursorEl.textContent = "█";
  kickerEl.append(kickerText, cursorEl);
  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  head.append(kickerEl, headlineEl, subheadEl);
  host.prepend(head);

  const actionsEl = part("div", "actions");
  const cornersEl = part("div", "corners");
  cornersEl.setAttribute("aria-hidden", "true");
  const rowEls = POSITIONS.map((pos, i) => {
    const corner = part("div", "corner");
    corner.setAttribute("data-pica-pos", pos);
    const rows = [0, 1].map((j) => {
      const row = document.createElement("div");
      row.setAttribute("data-pica", "");
      if (i === ACCENT_CORNER && j === 0) row.setAttribute("data-pica-hot", "");
      corner.append(row);
      return row;
    });
    cornersEl.append(corner);
    return rows;
  });
  host.append(actionsEl, cornersEl);

  // The scanline host goes on last, so its overlay paints above the copy, the corners, and the content.
  // The band is a span rather than a div: the composed core styles every div[data-pica] child of its host
  // as a stripe element, and the band must keep its own gradient.
  let scanLayer: Layer | null = null;
  let scan: ReturnType<typeof scanlines.mount> | null = null;
  let bandEl: HTMLElement | null = null;
  function mountScan(): void {
    scanLayer = layer(host, "over");
    scanLayer.el.style.overflow = "hidden";
    scanLayer.el.style.opacity = scanOpacity(props.intensity);
    scan = scanlines.mount(scanLayer.el, scanProps(props));
    bandEl = part("span", "band");
    scanLayer.el.append(bandEl);
  }
  function dropScan(): void {
    scan?.destroy();
    scan = null;
    scanLayer?.remove();
    scanLayer = null;
    bandEl = null;
  }
  if (props.scanlines) mountScan();

  // The headline is the glitch text's host: it keeps the heading's role, a hidden copy carries the text
  // to assistive technology, and the tearing draws into a layer hidden from it.
  const tear = glitchText.mount(headlineEl, tearProps(props));

  let epoch = -1;
  function renderReadouts(): void {
    const rows = readouts(props.seed, Math.max(0, epoch));
    rowEls.forEach((pair, i) => {
      const lines = rows[i] ?? [];
      pair.forEach((el, j) => {
        el.textContent = lines[j] ?? "";
      });
    });
  }

  // The section's own clock moves the roll band, blinks the cursor, and ticks the readouts once a second.
  // Everything on the frame is a style write or a text swap; the pictures underneath never redraw.
  let cursorOn = true;
  function draw(t: number): void {
    if (bandEl) {
      const phase = (((t % ROLL_MS) + ROLL_MS) % ROLL_MS) / ROLL_MS;
      bandEl.style.transform = `translateY(${(phase * 50).toFixed(3)}%)`;
    }
    const on = Math.floor(t / CURSOR_MS) % 2 === 0;
    if (on !== cursorOn) {
      cursorOn = on;
      cursorEl.style.opacity = on ? "1" : "0";
    }
    const next = Math.floor(t / 1000);
    if (next !== epoch) {
      epoch = next;
      if (props.telemetry) renderReadouts();
    }
    host.dataset.picaReady = "true";
  }
  const clock = createLoop({ el: host, fps: 30, paused: props.paused, time: props.time, still: 0, frame: draw });

  sheet.setRules(rules(sheet.selector, props));
  kickerEl.hidden = props.kicker.trim() === "";
  subheadEl.textContent = props.subhead;
  subheadEl.hidden = props.subhead.trim() === "";
  headlineEl.hidden = props.headline.trim() === "";
  cornersEl.hidden = !props.telemetry;
  renderActions(actionsEl, props.actions);
  renderReadouts();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      const motion = changed(before, props, ["paused", "time", "seed"]);

      if (props.headline !== before.headline) headlineEl.hidden = props.headline.trim() === "";
      if (motion || props.headline !== before.headline) tear.update(tearProps(props));
      if (props.kicker !== before.kicker) {
        kickerText.nodeValue = props.kicker;
        kickerEl.hidden = props.kicker.trim() === "";
      }
      if (props.subhead !== before.subhead) {
        subheadEl.textContent = props.subhead;
        subheadEl.hidden = props.subhead.trim() === "";
      }
      if (!sameJson(before.actions, props.actions)) renderActions(actionsEl, props.actions);
      if (props.scanlines !== before.scanlines) {
        if (props.scanlines) {
          mountScan();
          clock.redraw();
        } else {
          dropScan();
        }
      } else {
        if (scan && motion) scan.update(scanProps(props));
        if (scanLayer && props.intensity !== before.intensity) scanLayer.el.style.opacity = scanOpacity(props.intensity);
      }
      if (props.telemetry !== before.telemetry) {
        cornersEl.hidden = !props.telemetry;
        if (props.telemetry) renderReadouts();
      }
      if (props.align !== before.align || props.minHeight !== before.minHeight) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (props.seed !== before.seed) renderReadouts();
      clock.update({ paused: props.paused, time: props.time });
    },
    destroy() {
      clock.destroy();
      tear.destroy();
      dropScan();
      head.remove();
      actionsEl.remove();
      cornersEl.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
