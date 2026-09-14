import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { changed, sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import { hashSeed } from "../../../lib/rng";
import type { Mount, MotionProps } from "../../../lib/types";
import * as asciiNoiseField from "../../ascii/ascii-noise-field/core";
import * as asciiSparkline from "../../text-mode/ascii-sparkline/core";

export interface BentoHeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface BentoHeroFact {
  /** What the figure measures, drawn small in mono caps. */
  label: string;
  /** The figure itself, drawn large in mono. */
  value: string;
}

export interface BentoHeroProps extends MotionProps {
  /** Headline drawn in the lead cell. Empty draws nothing. */
  headline: string;
  /** Supporting line under the headline. Empty draws nothing. */
  subhead: string;
  /** Calls to action, drawn as links at the foot of the lead cell. The first draws solid in the accent, the rest outline. At most three are drawn. */
  actions: readonly BentoHeroAction[];
  /** Facts for the smaller cells, in order. At most four are drawn; the cells left over hold drawn fields. */
  facts: readonly BentoHeroFact[];
  /** Series for the trend cell's sparkline, oldest first. Empty removes the trend cell. */
  trend: readonly number[];
  /** Horizontal alignment of the lead cell's copy. */
  align: "start" | "center";
  /** What the flexible cells draw: a drifting noise field, or nothing, which leaves every cell content sized. */
  field: "noise" | "none";
  /** How strongly the noise fields show, from 0 to 1, mapped onto their contrast and density. */
  intensity: number;
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: BentoHeroProps = {
  headline: "Components drawn in text.",
  subhead: "A library of text-mode components for React and plain HTML, each one generated as a single file.",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  facts: [
    { label: "Components", value: "70+" },
    { label: "Median size", value: "4.6 KB" },
    { label: "Dependencies", value: "0" },
  ],
  trend: [14, 16, 18, 19, 21, 23, 26, 29, 27, 31, 34, 38],
  align: "start",
  field: "noise",
  intensity: 0.25,
  minHeight: 60,
  paused: false,
  time: null,
  seed: 1,
};

/** Below this host width the tray stacks into one column with the lead cell first. */
const TRAY_COLLAPSE = 620;

/** Auto rows the explicit grid keeps ready for the page's children, ahead of its one flexible row.
 *  Forty covers any reasonable count of wrapped nodes. */
const TRAY_ROWS = 40;

/** The last explicit line of the tray's grid: one row for the lead, TRAY_ROWS for children, one flexible. */
const TRAY_LAST = TRAY_ROWS + 3;

/** The members of the lower cell: the page's own children plus the core's field slot. Used both as an
 *  "of" list, which counts siblings, and expanded per selector, which scopes each arm to this host. */
const GROUP = ":not([data-pica]),[data-pica-lower]";

/** The ramp the field cells draw with, capped at `=` so the field can never reach the type's ink. */
const FIELD_GLYPHS = " .:-=";

/** Seed salts for the two noise mounts, so the lower cell's field and the side's field are independent
 *  streams off the same seed rather than the same picture twice. */
const LOWER_SEED = 5;
const SIDE_SEED = 11;

/** The tray's one gutter, shared by the scoped rules and the stacked layout's side margin. */
const GAP = "clamp(0.7rem,1.5vw,1.2rem)";
/** Cell padding, shared by the lead cell and the lower cell's text members. */
const PAD = "clamp(1.3rem,3vw,2.2rem)";

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function clampVh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Maps the 0 to 1 intensity onto ascii-noise-field's contrast range, kept soft so the field stays a texture. */
function noiseContrast(intensity: number): number {
  return 0.7 + Math.min(1, Math.max(0, intensity)) * 0.8;
}

/** Maps the 0 to 1 intensity onto ascii-noise-field's density range, biased sparse so most cells fall to
 *  the ramp's light end and only noise peaks reach `-` or `=`. */
function noiseDensity(intensity: number): number {
  return 0.78 - Math.min(1, Math.max(0, intensity)) * 0.22;
}

/** Props for one composed noise field: motion passes through, the seed is salted so no two mounts draw the
 *  same field, intensity becomes contrast and density, and the ramp and glyph size are pinned small so the
 *  field sits as texture rather than competing with the type. */
function fieldProps(p: BentoHeroProps, salt: number): Partial<typeof asciiNoiseField.defaults> {
  return { paused: p.paused, time: p.time, seed: hashSeed(p.seed, salt, 7), contrast: noiseContrast(p.intensity), density: noiseDensity(p.intensity), glyphs: FIELD_GLYPHS, fontSize: 10 };
}

/** Creates one element the core owns, marked for identification and named for its part. */
function part<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** A field's sub-host. Its position goes inline rather than through the scoped sheet, because the grid a
 *  field mounts reads the host's computed position at mount time and pins a static one: a mounted grid can
 *  never see a stylesheet that arrives later. */
function fieldHostEl(): HTMLElement {
  const el = part("div", "fieldhost");
  el.style.position = "absolute";
  el.style.inset = "0.55em";
  return el;
}

/** The scoped rules. The left column holds two cells: the lead, a single bordered box sized to its copy,
 *  and the lower cell, which is not one element: the page's children must stay direct host children, so
 *  the cell is every group member sharing left and right hairlines, with the first closing the top and the
 *  last closing the bottom. The group always ends with the field slot, a drawn field that absorbs whatever
 *  height the copy does not use, so the cell never holds a region of bare ground. Auto rows are gapless so
 *  the shared borders stay continuous; the gutter between the two left cells is the lead's bottom margin,
 *  which inflates its auto row. The minimum height goes in a :where() rule, which carries no specificity,
 *  so a page that gives the host a height wins. */
function trayRules(s: string, p: BentoHeroProps, hasSide: boolean): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  const pad = PAD;
  const gap = GAP;
  const hairline = `color-mix(in srgb, ${muted} 55%, transparent)`;
  const columns = hasSide ? "minmax(0,3fr) minmax(0,2fr)" : "minmax(0,1fr)";
  const slot = `${s} > :not([data-pica]), ${s} > [data-pica-lower]`;
  return [
    `:where(${s}){min-height:${clampVh(p.minHeight)}vh}`,
    `${s}{box-sizing:border-box;position:relative;display:grid;grid-template-columns:${columns};grid-template-rows:auto repeat(${TRAY_ROWS},minmax(0,auto)) minmax(auto,1fr);column-gap:${gap};row-gap:0;padding:${gap};color:${fg};text-align:${textAlign}}`,
    `${s}[data-pica-fit="min"]{grid-template-columns:minmax(0,1fr)}`,
    `${s} > [data-pica-lead]{grid-column:1;grid-row:1;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;gap:0.55em;margin:0 0 ${gap};padding:${pad};border:1px solid ${muted};text-align:${textAlign}}`,
    `${s} [data-pica-headline]{margin:0;font-size:clamp(2.1rem,5vw,3.6rem);line-height:1.05;font-weight:640;letter-spacing:-0.015em;overflow-wrap:break-word}`,
    `${s} [data-pica-subhead]{margin:0;font-size:clamp(0.95rem,1.4vw,1.12rem);line-height:1.55;color:${muted};max-width:36em${p.align === "center" ? ";margin-inline:auto" : ""}}`,
    `${s} [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.7em;justify-content:${edge};margin-top:0.45em}`,
    `${s} [data-pica-actions]:empty{display:none}`,
    `${s} [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.25em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    `${s} [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${s} [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${s} [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${s} [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${slot}{grid-column:1;min-width:0;box-sizing:border-box;margin-block:0;padding:0.4em ${pad};border-left:1px solid ${muted};border-right:1px solid ${muted};overflow-wrap:break-word}`,
    `${s} > :nth-child(1 of ${GROUP}){border-top:1px solid ${muted}}`,
    `${s} > :nth-child(1 of ${GROUP}):not([data-pica-lower]){padding-top:${pad}}`,
    `${s} > :nth-last-child(1 of ${GROUP}){border-bottom:1px solid ${muted}}`,
    `${s} > :nth-last-child(1 of ${GROUP}):not([data-pica-lower]){padding-bottom:${pad}}`,
    `${s} > [data-pica-lower]{overflow:hidden;padding:0;min-height:7rem}`,
    `${s} > :nth-child(n+2 of ${GROUP})[data-pica-lower]{border-top:1px solid ${hairline}}`,
    `${s} > [data-pica-side]{min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${gap};align-content:start}`,
    `${s}[data-pica-fit="min"] > [data-pica-side]{grid-template-columns:minmax(0,1fr)}`,
    `${s} [data-pica-cell]{min-width:0;box-sizing:border-box;position:relative;display:flex;flex-direction:column;justify-content:center;gap:0.45em;padding:0.75em 0.9em;border:1px solid ${muted}}`,
    `${s} [data-pica-cell][data-pica-wide]{grid-column:1/-1}`,
    `${s}[data-pica-fit="min"] [data-pica-cell][data-pica-wide]{grid-column:auto}`,
    `${s} [data-pica-flabel]{font-family:${GRID_FONT};font-size:0.68em;letter-spacing:0.05em;text-transform:uppercase;color:${muted}}`,
    `${s} [data-pica-fvalue]{font-family:${GRID_FONT};font-size:clamp(1.1rem,1.9vw,1.6rem);font-variant-numeric:tabular-nums;color:${fg}}`,
    `${s} [data-pica-sparkhost]{font-size:0.85em;line-height:1.3;min-width:0}`,
    `${s} [data-pica-cell][data-pica-fieldcell]{padding:0;overflow:hidden;min-height:6rem}`,
    // The field inks in muted rather than fg: the grid inside sets its own color from --pica-fg, so the
    // token is rerouted on its host. The fallback repeats muted's own fallback without naming the token,
    // which would be a self-reference and leave the field at full fg.
    `${s} [data-pica-fieldhost]{--pica-fg:var(--pica-muted,color-mix(in srgb,currentColor 65%,transparent))}`,
  ].join("\n");
}

export const mount: Mount<BentoHeroProps> = (host, initial = {}) => {
  let props: BentoHeroProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  let destroyed = false;

  // The lead cell is the first grid item: one bordered box holding the copy, sized to it.
  const lead = part("div", "lead");
  const headlineEl = part("h1", "headline");
  const subheadEl = part("p", "subhead");
  const actionsEl = part("div", "actions");
  lead.append(headlineEl, subheadEl, actionsEl);

  // The lower cell's field slot comes after the page's children, so it is always the last group member:
  // the cell reads copy, then a hairline, then the field that fills whatever height is left. Its position
  // is inline for the same reason as the field host's: it is the field's containing block from mount on.
  const lower = part("div", "lower");
  lower.style.position = "relative";
  const lowerHost = fieldHostEl();
  lower.append(lowerHost);

  const side = part("div", "side");

  host.prepend(lead);
  host.append(lower, side);

  let spark: ReturnType<typeof asciiSparkline.mount> | null = null;
  let lowerField: ReturnType<typeof asciiNoiseField.mount> | null = null;
  let sideField: ReturnType<typeof asciiNoiseField.mount> | null = null;
  let leadOn = true;

  function renderLead(): void {
    headlineEl.textContent = props.headline;
    headlineEl.style.display = props.headline === "" ? "none" : "";
    subheadEl.textContent = props.subhead;
    subheadEl.style.display = props.subhead === "" ? "none" : "";
    renderActions();
    leadOn = props.headline !== "" || props.subhead !== "" || actionsEl.childElementCount > 0;
    lead.style.display = leadOn ? "" : "none";
  }

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

  function factTile(fact: BentoHeroFact): HTMLElement {
    const cell = part("div", "cell");
    const label = part("div", "flabel");
    label.textContent = fact.label;
    const value = part("div", "fvalue");
    value.textContent = fact.value;
    cell.append(label, value);
    return cell;
  }

  function trendTile(): HTMLElement {
    const cell = part("div", "cell");
    const label = part("div", "flabel");
    label.textContent = "Trend";
    const clean = props.trend.filter((v) => Number.isFinite(v));
    const value = part("div", "fvalue");
    value.textContent = String(clean[clean.length - 1] ?? 0);
    const sub = part("div", "sparkhost");
    cell.append(label, value, sub);
    spark = asciiSparkline.mount(sub, { values: [...props.trend], label: "trend" });
    return cell;
  }

  function fieldTile(): HTMLElement {
    const cell = part("div", "cell");
    cell.setAttribute("data-pica-fieldcell", "");
    const sub = fieldHostEl();
    cell.append(sub);
    sideField = asciiNoiseField.mount(sub, fieldProps(props, SIDE_SEED));
    return cell;
  }

  /** Mounts or unmounts the lower cell's field with the prop, keeping the slot before the side in the
   *  document so the stacked order reads lead, lower cell, minor cells. */
  function syncLower(): void {
    if (props.field === "noise") {
      if (!lower.isConnected) {
        if (side.isConnected) host.insertBefore(lower, side);
        else host.append(lower);
      }
      if (!lowerField) lowerField = asciiNoiseField.mount(lowerHost, fieldProps(props, LOWER_SEED));
    } else {
      lowerField?.destroy();
      lowerField = null;
      if (lower.isConnected) lower.remove();
    }
  }

  /** Rebuilds the minor cells from the props: the facts, then the trend cell, then the field. An odd count
   *  leaves the last cell alone on its row, so it spans both columns and reads wider than the rest. The
   *  field is always last, because the side's one flexible row is its last: only drawn content may grow
   *  into spare height. */
  function buildMinors(): void {
    spark?.destroy();
    spark = null;
    sideField?.destroy();
    sideField = null;
    const tiles = props.facts.slice(0, 4).map(factTile);
    if (props.trend.some((v) => Number.isFinite(v))) tiles.push(trendTile());
    if (props.field === "noise") tiles.push(fieldTile());
    side.replaceChildren();
    if (tiles.length === 0) {
      if (side.isConnected) side.remove();
      return;
    }
    if (tiles.length % 2 === 1) tiles[tiles.length - 1]?.setAttribute("data-pica-wide", "");
    side.append(...tiles);
    if (!side.isConnected) host.append(side);
  }

  /** Places the two moving items. On the wide layout the side spans every row of column two and the field
   *  slot takes the lower cell's rows from under the copy through the flexible last row, so both columns
   *  reach the tray's floor and the field, not a gap, fills whatever the copy does not. Stacked, everything
   *  flows in one column in document order and the side takes the flexible row instead. In either case the
   *  side's own last row flexes only while it holds the field cell, so a fact cell is never stretched into
   *  bare ground. */
  function applyLayout(): void {
    const min = host.clientWidth < TRAY_COLLAPSE;
    attrs.set("data-pica-fit", min ? "min" : null);
    const kids = host.querySelectorAll(":scope > :not([data-pica])").length;
    const after = 1 + (leadOn ? 1 : 0) + kids;
    const lowOn = lower.isConnected;
    if (min) {
      lower.style.gridRow = `${Math.min(after, TRAY_LAST - 1)} / span 1`;
      side.style.gridColumn = "1";
      side.style.gridRow = `${Math.min(after + (lowOn ? 1 : 0), TRAY_LAST - 1)} / -1`;
      // The stacked gutter under the lower cell. When the group is empty the lead's own bottom margin
      // already separates it from the side, so nothing more is added.
      side.style.marginTop = kids + (lowOn ? 1 : 0) > 0 ? GAP : "0";
    } else {
      lower.style.gridRow = `${Math.min(after, TRAY_LAST - 1)} / -1`;
      side.style.gridColumn = "2";
      side.style.gridRow = "1 / -1";
      side.style.marginTop = "0";
    }
    const tiles = side.children.length;
    const rows = Math.ceil(tiles / (min ? 1 : 2));
    const flexes = props.field === "noise" && tiles > 0;
    side.style.gridTemplateRows = flexes ? (rows > 1 ? `repeat(${rows - 1},auto) minmax(auto,1fr)` : "minmax(auto,1fr)") : `repeat(${Math.max(rows, 1)},auto)`;
  }

  const resizer = typeof ResizeObserver === "function" ? new ResizeObserver(applyLayout) : null;
  const mutator = typeof MutationObserver === "function" ? new MutationObserver(applyLayout) : null;

  renderLead();
  buildMinors();
  syncLower();
  sheet.setRules(trayRules(sheet.selector, props, side.isConnected));
  applyLayout();
  resizer?.observe(host);
  mutator?.observe(host, { childList: true });
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (changed(before, props, ["headline", "subhead"]) || !sameJson(before.actions, props.actions)) renderLead();
      if (changed(before, props, ["facts", "trend", "field"])) {
        buildMinors();
        syncLower();
        sheet.setRules(trayRules(sheet.selector, props, side.isConnected));
      }
      if (changed(before, props, ["paused", "time", "seed", "intensity"])) {
        lowerField?.update(fieldProps(props, LOWER_SEED));
        sideField?.update(fieldProps(props, SIDE_SEED));
      }
      if (changed(before, props, ["align", "minHeight"])) sheet.setRules(trayRules(sheet.selector, props, side.isConnected));
      applyLayout();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      resizer?.disconnect();
      mutator?.disconnect();
      spark?.destroy();
      lowerField?.destroy();
      sideField?.destroy();
      lead.remove();
      lower.remove();
      side.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
