import * as photocopyImage from "../../effects/photocopy-image/core";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { changed, sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import { createRng, hashSeed } from "../../../lib/rng";
import type { Mount } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface ScrapbookHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface ScrapbookHeroProps {
  /** The headline, set largest on its own torn and taped slip. Empty hides the slip. */
  headline: string;
  /** Supporting copy on a second slip, set smaller and offset from the headline. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as links. At most three: the first draws solid in the accent, the rest outline. */
  actions: readonly ScrapbookHeroAction[];
  /** Horizontal alignment of the slips within the host. */
  align: "start" | "center";
  /** The caption set under the pasted photocopy print, in small mono. Empty hides the caption line. */
  caption: string;
  /** The note written on the ruled index-card scrap. Newlines start a new line. Empty hides the card. */
  note: string;
  /** The tiny label under the barcode stub tucked behind the photo. Empty hides the stub. */
  stub: string;
  /** The metadata line on the long slip pinned along the bottom edge. Empty hides the strip. */
  footline: string;
  /** Seed behind every rotation, tear, and tape placement, so the same seed lays out the same page. */
  seed: number;
  /** The most a slip may tilt, in degrees. Each slip draws its own angle inside the range. */
  tilt: number;
  /** The deepest a torn edge may bite into a slip, in pixels. Zero cuts every slip clean. */
  tear: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: ScrapbookHeroProps = {
  headline: "Pasted together on purpose.",
  subhead: "Torn edges, taped corners, and a photocopied study — every one of them drawn from a single seed.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  caption: "fig. 01 · the built-in study, copied and pasted",
  note: "Field notes\nEvery tilt, tear and tape strip on this page comes from one seed.",
  stub: "no. 09",
  footline: "picagram · sheet 09 of 12 · assembled by hand",
  seed: 1,
  tilt: 2,
  tear: 8,
  minHeight: 80,
};

/** Points along each edge of a torn silhouette: fine enough to read as fibre, few enough to stay cheap. */
const EDGE_STEPS = 11;
/** How far the paper face sits inside its fibrous rim, in pixels. The rim showing past the face is the
 *  deckle a torn sheet leaves. */
const FACE_INSET = 1.7;
/** Host width in pixels under which the pasted collage folds into the flow under the content. */
const FIT_MIN = 760;
/** Tape strip length and width, in em at the slip's font size. */
const TAPE_LEN = 2.7;
const TAPE_WID = 0.72;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return clamp(minHeight, 0, 100);
}

/** A seeded angle in degrees for one slip: uniform inside ±tilt, but never so small it reads as straight,
 *  because a hand never places a slip exactly on the axis. Tilt 0 lays every slip flat. */
function angle(rng: () => number, tilt: number): number {
  const t = clamp(tilt, 0, 3);
  const a = (rng() * 2 - 1) * t;
  const floor = t * 0.35;
  return Math.abs(a) < floor ? (a < 0 ? -floor : floor) : a;
}

/** A polygon coordinate as a percent with one decimal. */
function pc(v: number): string {
  return `${v.toFixed(1)}%`;
}

/** A pixel offset from the 0 edge, where a positive value bites into the paper. */
function off0(v: number): string {
  return `${v.toFixed(1)}px`;
}

/** A pixel offset from the 100% edge, where a positive value bites into the paper. */
function off100(v: number): string {
  return v >= 0 ? `calc(100% - ${v.toFixed(1)}px)` : `calc(100% + ${(-v).toFixed(1)}px)`;
}

/** The silhouette of one torn slip, emitted twice from one set of seeded offsets: the deckle polygon is the
 *  raw tear and the face polygon is the same edge pushed FACE_INSET further in, so a fibrous rim of the
 *  deckle layer shows around the whole slip. Each edge carries a slow seeded bend, fine per-point fibre
 *  jitter, and usually one deeper notch where the paper gave way, which is what makes it read as a tear
 *  rather than a wobble. */
function tornPair(rng: () => number, tear: number): { deckle: string; face: string } {
  const depth = Math.max(0, tear);
  const edges: number[][] = [];
  for (let e = 0; e < 4; e++) {
    const wave = (rng() * 2 - 1) * depth * 0.55;
    const notchAt = 1 + Math.floor(rng() * (EDGE_STEPS - 1));
    const notch = rng() < 0.7 ? depth * (0.3 + rng() * 0.5) : 0;
    const pts: number[] = [];
    for (let i = 0; i <= EDGE_STEPS; i++) {
      const end = i === 0 || i === EDGE_STEPS ? 0.35 : 1;
      let v = wave * Math.sin((Math.PI * i) / EDGE_STEPS) + (rng() * 2 - 1) * depth * 0.42 * end;
      if (i === notchAt) v += notch;
      pts.push(clamp(v, -0.7, depth * 1.4));
    }
    edges.push(pts);
  }
  const [top = [], right = [], bottom = [], left = []] = edges;
  const poly = (inset: number): string => {
    const pts: string[] = [];
    for (let i = 0; i <= EDGE_STEPS; i++) pts.push(`${pc((i / EDGE_STEPS) * 100)} ${off0((top[i] ?? 0) + inset)}`);
    for (let i = 1; i <= EDGE_STEPS; i++) pts.push(`${off100((right[i] ?? 0) + inset)} ${pc((i / EDGE_STEPS) * 100)}`);
    for (let i = 1; i <= EDGE_STEPS; i++) pts.push(`${pc(100 - (i / EDGE_STEPS) * 100)} ${off100((bottom[i] ?? 0) + inset)}`);
    for (let i = 1; i < EDGE_STEPS; i++) pts.push(`${off0((left[i] ?? 0) + inset)} ${pc(100 - (i / EDGE_STEPS) * 100)}`);
    return `polygon(${pts.join(",")})`;
  };
  return { deckle: poly(0), face: poly(FACE_INSET) };
}

/** The clip for one tape strip: a flat rectangle whose four corners are each nudged a pixel or so, so the
 *  short ends read as torn off a roll while the strip keeps definite edges. */
function tapeClip(rng: () => number): string {
  const j = () => `${((rng() * 2 - 1) * 1.3).toFixed(1)}px`;
  return `polygon(${j()} ${j()}, calc(100% + ${j()}) ${j()}, calc(100% + ${j()}) calc(100% + ${j()}), ${j()} calc(100% + ${j()}))`;
}

/** One strip of tape seated on a slip's corner, half on the paper and half off it so it is holding the
 *  slip down rather than decorating it. The corner index picks which corner: 0 top left, 1 top right,
 *  2 bottom right, 3 bottom left. The seed jitters the seat and the angle so no two strips land alike. */
function tapeCss(rng: () => number, taken: readonly number[]): { index: number; css: string } {
  let c = Math.floor(rng() * 4);
  while (taken.includes(c)) c = (c + 1) % 4;
  const angle = (c === 0 || c === 2 ? -45 : 45) + (rng() * 2 - 1) * 10;
  // The strip's centre lands on the corner point: half the length overhangs the slip on each axis.
  const along = (-TAPE_LEN / 2 + (rng() * 2 - 1) * 0.3).toFixed(2);
  const off = (-TAPE_WID / 2 + (rng() * 2 - 1) * 0.12).toFixed(2);
  const side = c <= 1 ? `top:${off}em` : `bottom:${off}em`;
  const edge = c === 0 || c === 3 ? `left:${along}em` : `right:${along}em`;
  return { index: c, css: `${side};${edge};transform:rotate(${angle.toFixed(1)}deg)` };
}

/** A seeded indent for one block in the left column. Start alignment staggers the slips down the page on
 *  growing offsets; center alignment jitters each one a little off the middle. Either way the order still
 *  reads top to bottom, which is what keeps the page a page. */
function indent(rng: () => number, center: boolean, base: number): string {
  const rem = center ? (rng() * 2 - 1) * 1.1 : Math.max(0, base + (rng() * 2 - 1) * 0.7);
  return `${rem.toFixed(2)}rem`;
}

interface SlipStyle {
  /** Position for the slip's wrap: the stub sits absolutely on the photo's corner. */
  pos?: string;
  /** Base rem offset for margin-inline-start, or null for no indent. */
  indent: number | null;
  /** align-self for the slip's wrap. */
  self: string;
  /** How many tape strips hold this slip. */
  tapes: number;
  /** Tilt range multiplier: loose scraps tilt harder than the headline. */
  swing: number;
  /** Tear depth multiplier: thin slips tear shallower so the bite never reaches the text. */
  depth: number;
  /** Extra declarations appended to the wrap rule, such as the stub's overlap margins. */
  wrapExtra?: string;
  /** Extra declarations appended to the paper rule, such as the card's ruled lines. */
  paperExtra?: string;
}

/** Emits the rules for one slip: its tilt and seat, the fibrous deckle rim, the paper face's tint and torn
 *  silhouette, and one rule per tape strip. The slip's name scopes everything to that slip alone. */
function slipRules(s: string, name: string, rng: () => number, p: ScrapbookHeroProps, style: SlipStyle): string[] {
  const fg = cssVar("fg");
  const center = p.align === "center";
  // The deckle shows through the translucent face, so the face's effective tone is the two layered: keep
  // the composite under ~35% of fg or no on-paper text can clear 4.5:1 on the dark ground.
  const rim = (16 + rng() * 6).toFixed(0);
  const paper = (9 + rng() * 4).toFixed(0);
  const pair = tornPair(rng, Math.max(0, p.tear) * style.depth);
  const margin = style.indent === null ? "" : `margin-inline-start:${indent(rng, center, style.indent)};`;
  const rules: string[] = [
    `${s} [data-pica-slip="${name}"]{position:${style.pos ?? "relative"};width:fit-content;max-width:100%;align-self:${style.self};${margin}transform:rotate(${angle(rng, p.tilt * style.swing).toFixed(2)}deg);${style.wrapExtra ?? ""}}`,
    `${s} [data-pica-slip="${name}"] [data-pica-deckle]{position:absolute;inset:0;background:color-mix(in srgb, ${fg} ${rim}%, transparent);clip-path:${pair.deckle}}`,
    `${s} [data-pica-slip="${name}"] [data-pica-paper]{position:relative;display:block;background:color-mix(in srgb, ${fg} ${paper}%, transparent);clip-path:${pair.face};${style.paperExtra ?? ""}}`,
  ];
  const taken: number[] = [];
  for (let i = 0; i < style.tapes; i++) {
    const tape = tapeCss(rng, taken);
    taken.push(tape.index);
    rules.push(`${s} [data-pica-slip="${name}"] [data-pica-tape="${i}"]{${tape.css};clip-path:${tapeClip(rng)}}`);
  }
  return rules;
}

/** Layout for the host and every slip on it. The page's children keep their own nodes and the page's own
 *  font; the core only seats them in the same staggered column. The collage owns the right edge on wide
 *  hosts, held clear by the host's right padding, and folds into the flow on narrow ones. The minimum
 *  height sits in a :where() rule, which carries no specificity, so a page that gives this host a height
 *  still wins. */
function rules(s: string, p: ScrapbookHeroProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const center = p.align === "center";
  const textAlign = center ? "center" : "start";
  const edge = center ? "center" : "flex-start";
  const hairline = `color-mix(in srgb, ${fg} 24%, transparent)`;
  // Secondary text on a slip sits over the paper tint, not the bare ground, so plain muted would fall
  // short of 4.5:1 there. Lifting muted partway toward fg keeps it dimmer than the headline and readable.
  const paperInk = `color-mix(in srgb, ${muted} 35%, ${fg})`;
  const head = createRng(hashSeed(p.seed, 11));
  const sub = createRng(hashSeed(p.seed, 29));
  const act = createRng(hashSeed(p.seed, 47));
  const stub = createRng(hashSeed(p.seed, 71));
  const photo = createRng(hashSeed(p.seed, 97));
  const card = createRng(hashSeed(p.seed, 131));
  const meta = createRng(hashSeed(p.seed, 149));
  const kids = createRng(hashSeed(p.seed, 173));

  const out: string[] = [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{position:relative;isolation:isolate;overflow:hidden;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:clamp(1.1rem,3vh,1.9rem);--sb-pad:clamp(1.25rem,5vw,4.5rem);--sb-collage:min(36%,23rem);padding:clamp(2.2rem,7vh,4.5rem) calc(var(--sb-pad) + var(--sb-collage)) clamp(2.2rem,7vh,4.5rem) var(--sb-pad);color:${fg};text-align:${textAlign}}`,
    `${s}[data-pica-fit="min"]{--sb-collage:0rem}`,
    `${s} *{box-sizing:border-box}`,
    `${s} > :not([data-pica]){order:0;margin:0;margin-inline-start:${indent(kids, center, 3.4)};max-width:34rem;text-align:${textAlign}}`,
    `${s} [data-pica-paper]{text-align:${textAlign}}`,
    `${s} [data-pica-tape]{position:absolute;width:${TAPE_LEN}rem;height:${TAPE_WID}rem;background:color-mix(in srgb, ${muted} 60%, transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb, ${muted} 80%, transparent);pointer-events:none}`,
    `${s} [data-pica-slip="head"]{order:-4}`,
    `${s} [data-pica-slip="head"] [data-pica-paper]{padding:0.5em 0.75em 0.6em}`,
    `${s} [data-pica-slip="head"] h1{margin:0;font-size:clamp(2.1rem,5.4vw,3.9rem);line-height:1.03;font-weight:700;letter-spacing:-0.015em;text-wrap:balance;overflow-wrap:break-word}`,
    `${s} [data-pica-slip="sub"]{order:-3}`,
    `${s} [data-pica-slip="sub"] [data-pica-paper]{padding:0.55em 0.8em 0.65em}`,
    `${s} [data-pica-slip="sub"] p{margin:0;font-size:clamp(1rem,1.35vw,1.2rem);line-height:1.55;color:${paperInk};overflow-wrap:break-word}`,
    `${s} [data-pica-actions]{order:-2;display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;align-self:${edge};margin-inline-start:${indent(act, center, 0.9)};margin-block-start:0.3em}`,
    `${s} [data-pica-actions]:empty{display:none}`,
    `${s} [data-pica-actions] a{appearance:none;margin:0;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.62em 1.3em;display:inline-flex;align-items:center;border:1px solid ${muted};border-radius:0;color:${fg};background:color-mix(in srgb, ${fg} 6%, transparent);cursor:pointer}`,
    `${s} [data-pica-actions] a[data-variant="solid"]{background:${accent};border-color:${accent};color:${cssOn("accent")}}`,
    `${s} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${s} [data-pica-actions] a[data-variant="outline"]:hover{border-color:${fg};background:color-mix(in srgb, ${fg} 12%, transparent)}`,
    `${s} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    // The pasted collage owns the right column from pad to pad on wide hosts; below the fold width it drops
    // into the flow under the children, where it fills the lower part of the page instead.
    `${s} [data-pica-collage]{position:absolute;top:var(--sb-pad);right:var(--sb-pad);bottom:var(--sb-pad);width:var(--sb-collage);display:flex;flex-direction:column;justify-content:space-evenly;gap:1.2em;pointer-events:none}`,
    `${s}[data-pica-fit="min"] [data-pica-collage]{position:static;width:auto;max-width:27rem;align-self:center;align-items:center;margin-block:0.4em;justify-content:center;gap:1.6em}`,
    `${s} [data-pica-print]{width:17rem;max-width:100%;margin-inline:auto;aspect-ratio:1/1;background:${cssOn("fg")};border:1px solid ${hairline}}`,
    `${s} [data-pica-caption]{margin:0.5em auto 0;max-width:17rem;font-family:${GRID_FONT};font-size:0.66rem;line-height:1.5;letter-spacing:0.06em;text-transform:uppercase;color:${paperInk};overflow-wrap:break-word}`,
    `${s} [data-pica-caption]:empty{display:none}`,
    `${s} [data-pica-slip="card"] [data-pica-paper]{padding:0.55em 0.85em 0.7em;background-image:repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.6em - 1px), ${hairline} calc(1.6em - 1px), ${hairline} 1.6em);background-origin:content-box}`,
    `${s} [data-pica-note]{margin:0;font-family:${GRID_FONT};font-size:0.72rem;line-height:1.6em;letter-spacing:0.03em;color:${paperInk};white-space:pre-line;overflow-wrap:break-word}`,
    `${s} [data-pica-slip="stub"] [data-pica-paper]{padding:0.4em 0.5em 0.45em}`,
    `${s} [data-pica-bars]{height:0.85em;background-image:repeating-linear-gradient(90deg, color-mix(in srgb, ${fg} 85%, transparent) 0 1px, transparent 1px 3px),repeating-linear-gradient(90deg, transparent 0 2px, color-mix(in srgb, ${fg} 85%, transparent) 2px 4px, transparent 4px 6px)}`,
    `${s} [data-pica-stub-label]{margin-top:0.25em;font-family:${GRID_FONT};font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:${paperInk}}`,
    `${s} [data-pica-slip="meta"]{order:1;margin-top:auto}`,
    `${s} [data-pica-slip="meta"] [data-pica-paper]{padding:0.45em 0.9em 0.5em}`,
    `${s} [data-pica-footline]{font-family:${GRID_FONT};font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:${paperInk};overflow-wrap:break-word}`,
  ];

  for (let i = 0; i < 3; i++) {
    const a = (act() < 0.5 ? -1 : 1) * (0.45 + act() * 0.55) * clamp(p.tilt, 0, 3) * 0.6;
    out.push(`${s} [data-pica-actions] a:nth-of-type(${i + 1}){transform:rotate(${a.toFixed(2)}deg)}`);
  }
  out.push(...slipRules(s, "head", head, p, { indent: 0.15, self: edge, tapes: 2, swing: 1, depth: 1 }));
  out.push(...slipRules(s, "sub", sub, p, { indent: 2.2, self: edge, tapes: 1, swing: 1, depth: 0.9 }));
  out.push(
    ...slipRules(s, "stub", stub, p, {
      pos: "absolute",
      indent: null,
      self: "flex-end",
      tapes: 1,
      swing: 1.8,
      depth: 0.6,
      wrapExtra: "top:-1.55em;right:-0.55em;z-index:2;",
    }),
  );
  out.push(...slipRules(s, "photo", photo, p, { indent: null, self: "flex-start", tapes: 2, swing: 1.2, depth: 0.85 }));
  out.push(...slipRules(s, "card", card, p, { indent: null, self: "flex-start", tapes: 1, swing: 1.5, depth: 0.85 }));
  out.push(
    ...slipRules(s, "meta", meta, p, {
      indent: 1.4,
      self: edge,
      tapes: 1,
      swing: 0.7,
      depth: 0.55,
      wrapExtra: "max-width:34rem;",
    }),
  );
  // Inside the collage the slips stagger against its right edge instead of the page's left one.
  out.push(`${s} [data-pica-collage] [data-pica-slip="photo"]{margin-inline-start:${(0.4 + photo() * 0.9).toFixed(2)}rem}`);
  out.push(`${s} [data-pica-collage] [data-pica-slip="card"]{margin-inline-start:${(1.2 + card() * 1.4).toFixed(2)}rem}`);
  return out.join("\n");
}

/** Creates one element the core owns, marked for identification. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string, value: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(name, value);
  return node;
}

/** A paper slip: the wrapper the seed tilts, the fibrous deckle rim behind the torn paper face, and the
 *  tape strips on top, each holding down a corner. */
function slip(name: string, tapes: number): { wrap: HTMLElement; paper: HTMLElement } {
  const wrap = part("div", "data-pica-slip", name);
  const deckle = part("div", "data-pica-deckle", "");
  deckle.setAttribute("aria-hidden", "true");
  const paper = part("div", "data-pica-paper", "");
  wrap.append(deckle, paper);
  for (let i = 0; i < tapes; i++) {
    const tape = part("span", "data-pica-tape", String(i));
    tape.setAttribute("aria-hidden", "true");
    wrap.append(tape);
  }
  return { wrap, paper };
}

/** Writes a slip's text and hides the whole slip when it has nothing to say. */
function renderSlip(el: HTMLElement, wrap: HTMLElement, text: string): void {
  el.textContent = text;
  wrap.hidden = text.trim() === "";
}

export const mount: Mount<ScrapbookHeroProps> = (host, initial = {}) => {
  let props: ScrapbookHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const attrs = hostAttributes(host);

  const head = slip("head", 2);
  const headlineEl = part("h1", "data-pica-headline", "");
  head.paper.append(headlineEl);
  const sub = slip("sub", 1);
  const subheadEl = part("p", "data-pica-subhead", "");
  sub.paper.append(subheadEl);
  const actionsEl = part("div", "data-pica-actions", "");

  // The collage is the page's second cluster: a barcode stub tucked behind a taped photocopy print and a
  // ruled index card, all held to the right edge on wide hosts.
  const collage = part("div", "data-pica-collage", "");
  const stub = slip("stub", 1);
  const bars = part("div", "data-pica-bars", "");
  bars.setAttribute("aria-hidden", "true");
  const stubLabel = part("div", "data-pica-stub-label", "");
  stub.paper.append(bars, stubLabel);
  const photo = slip("photo", 2);
  const print = part("div", "data-pica-print", "");
  const captionEl = part("div", "data-pica-caption", "");
  photo.paper.append(print, captionEl);
  // The stub is a scrap tucked under the photo's top right corner, held by its own tape strip.
  photo.wrap.append(stub.wrap);
  const card = slip("card", 1);
  const noteEl = part("p", "data-pica-note", "");
  card.paper.append(noteEl);
  collage.append(photo.wrap, card.wrap);

  const metaSlip = slip("meta", 1);
  const footEl = part("span", "data-pica-footline", "");
  metaSlip.paper.append(footEl);

  // The slips prepend ahead of the wrapped children so the headline leads the DOM; everything else lands
  // after them, and flex order puts the calls to action back above the page's own copy.
  host.prepend(head.wrap, sub.wrap);
  host.append(actionsEl, collage, metaSlip.wrap);

  const photoInstance = photocopyImage.mount(print, { seed: props.seed, contrast: 1.15 });

  /** Rebuilds the action links from JSON: the first solid, the rest outline, in source order. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      a.dataset.variant = i === 0 ? "solid" : "outline";
      a.href = action.href;
      a.textContent = action.label;
      actionsEl.append(a);
    }
  }

  /** Below the fold width the collage drops out of its column and into the flow under the content. */
  function measure(): void {
    attrs.set("data-pica-fit", host.clientWidth < FIT_MIN ? "min" : null);
  }

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;

  sheet.setRules(rules(sheet.selector, props));
  renderSlip(headlineEl, head.wrap, props.headline);
  renderSlip(subheadEl, sub.wrap, props.subhead);
  renderSlip(noteEl, card.wrap, props.note);
  renderSlip(stubLabel, stub.wrap, props.stub);
  renderSlip(footEl, metaSlip.wrap, props.footline);
  captionEl.textContent = props.caption;
  captionEl.hidden = props.caption.trim() === "";
  renderActions();
  measure();
  observer?.observe(host);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (before.headline !== props.headline) renderSlip(headlineEl, head.wrap, props.headline);
      if (before.subhead !== props.subhead) renderSlip(subheadEl, sub.wrap, props.subhead);
      if (before.note !== props.note) renderSlip(noteEl, card.wrap, props.note);
      if (before.stub !== props.stub) renderSlip(stubLabel, stub.wrap, props.stub);
      if (before.footline !== props.footline) renderSlip(footEl, metaSlip.wrap, props.footline);
      if (before.caption !== props.caption) {
        captionEl.textContent = props.caption;
        captionEl.hidden = props.caption.trim() === "";
      }
      if (!sameJson(before.actions, props.actions)) renderActions();
      if (changed(before, props, ["align", "minHeight", "seed", "tilt", "tear"])) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (before.seed !== props.seed) photoInstance.update({ seed: props.seed });
    },
    destroy() {
      observer?.disconnect();
      photoInstance.destroy();
      head.wrap.remove();
      sub.wrap.remove();
      actionsEl.remove();
      collage.remove();
      metaSlip.wrap.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
