import { GRID_FONT } from "../../../lib/font";
import { createGrid, type Grid } from "../../../lib/glyph-grid";
import { layer, scope } from "../../../lib/host";
import { changed, sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

/** One call to action: a link's visible text and destination. */
export interface VictorianHeroAction {
  /** Text on the link, drawn in mono capitals. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface VictorianHeroProps {
  /** The small line at the top of the stack, set in tracked mono capitals. Empty hides it. */
  kicker: string;
  /** The largest line of the bill, set in the page's own face at display size. Empty hides it. */
  headline: string;
  /** The medium line under the headline, set in italics. Empty hides it. */
  subhead: string;
  /** Calls to action, drawn as ruled links. At most three show, and the first takes a doubled rule. */
  actions: readonly VictorianHeroAction[];
  /** Text alignment inside the bill. */
  align: "center" | "start";
  /** The border: a heavy outer rule doubled by a thin inner frame with fleuron corners, the heavy rule alone, or none. */
  frame: "double" | "single" | "none";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
}

export const defaults: VictorianHeroProps = {
  kicker: "Picagram presents",
  headline: "The Victorian Hero",
  subhead: "A playbill for the printed web, drawn in type and rules alone.",
  actions: [
    { label: "See the bill", href: "#bill" },
    { label: "Book seats", href: "#seats" },
  ],
  align: "center",
  frame: "double",
  minHeight: 80,
};

/** The corner fleuron, a diamond four cells wide and three tall cut from block glyphs, written into the
 *  gap between the outer rule and the inner frame. */
const FLEURON: readonly (readonly [number, number, string])[] = [
  [1, 0, "▟"],
  [2, 0, "▙"],
  [0, 1, "▟"],
  [1, 1, "█"],
  [2, 1, "█"],
  [3, 1, "▙"],
  [1, 2, "▜"],
  [2, 2, "▛"],
];

/** Keeps minHeight inside a sane range even if a caller passes something outside 0 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** One of the core's own nodes: marked, and named for its part in the bill so the scoped rules can find it. */
function part(name: string, tag: keyof HTMLElementTagNameMap = "div"): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute(`data-pica-${name}`, "");
  return node;
}

/** Whether the page put anything of its own inside the host, so the stack knows to rule around it. */
function hasChildren(host: HTMLElement): boolean {
  for (const node of host.childNodes) {
    if (node.nodeType === 1) {
      if (!(node as Element).hasAttribute("data-pica")) return true;
    } else if (node.nodeType === 3 && (node.textContent ?? "").trim() !== "") {
      return true;
    }
  }
  return false;
}

/** One rule between two lines of the stack: a hairline on each side of a small diamond, the way a
 *  centered ornament breaks a rule on a printed bill. */
function makeRule(): HTMLElement {
  const rule = part("rule");
  rule.setAttribute("aria-hidden", "true");
  const gem = part("gem", "span");
  gem.textContent = "▟▙\n▜▛";
  rule.append(part("line", "span"), gem, part("line", "span"));
  return rule;
}

/** The doubled border: a heavy block outer rule, a thin inner frame four cells in, and a diamond
 *  fleuron in each corner of the margin between them. Small hosts keep the heavy rule alone. */
function drawFrame(grid: Grid, p: VictorianHeroProps): void {
  const cols = grid.cols;
  const rows = grid.rows;
  grid.clear();
  if (p.frame !== "none" && cols >= 6 && rows >= 6) {
    for (let x = 0; x < cols; x++) {
      grid.set(x, 0, x === 0 ? "▛" : x === cols - 1 ? "▜" : "▀");
      grid.set(x, rows - 1, x === 0 ? "▙" : x === cols - 1 ? "▟" : "▄");
    }
    for (let y = 1; y < rows - 1; y++) {
      grid.set(0, y, "█");
      grid.set(cols - 1, y, "█");
    }
    if (p.frame === "double" && cols >= 20 && rows >= 12) {
      for (const [x, y] of [
        [1, 1],
        [cols - 5, 1],
        [1, rows - 4],
        [cols - 5, rows - 4],
      ] as const) {
        for (const [dx, dy, ch] of FLEURON) grid.set(x + dx, y + dy, ch);
      }
      const top = 4;
      const bottom = rows - 5;
      const left = 4;
      const right = cols - 5;
      for (let x = left + 1; x < right; x++) {
        grid.set(x, top, "─");
        grid.set(x, bottom, "─");
      }
      for (let y = top + 1; y < bottom; y++) {
        grid.set(left, y, "│");
        grid.set(right, y, "│");
      }
      grid.set(left, top, "┌");
      grid.set(right, top, "┐");
      grid.set(left, bottom, "└");
      grid.set(right, bottom, "┘");
    }
  }
  grid.flush();
}

/** Layout for the bill: every line of the stack shares one measure, rules are hairlines, corners stay
 *  square, and mono belongs to the label lines alone so the prose keeps the page's own face. The
 *  minimum height goes in a :where() rule, which carries no specificity, so a page that gives this
 *  host a height of its own wins. */
function rules(selector: string, p: VictorianHeroProps): string {
  const s = selector;
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const centered = p.align !== "start";
  const pad =
    p.frame === "double"
      ? "clamp(4.5rem,10vh,7rem) clamp(3.25rem,8vw,7rem)"
      : p.frame === "single"
        ? "clamp(2.25rem,6vh,4rem) clamp(1.75rem,4vw,3rem)"
        : "clamp(1.5rem,5vh,4rem) clamp(1.5rem,5vw,4rem)";
  return [
    `:where(${s}){min-height:${vh(p.minHeight)}vh}`,
    `${s}{position:relative;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${centered ? "center" : "flex-start"};text-align:${centered ? "center" : "start"};color:${fg};padding:${pad};overflow-wrap:break-word}`,
    `${s} > *{box-sizing:border-box;margin:0}`,
    `${s} > [data-pica-kicker]{width:min(46rem,100%);font-family:${GRID_FONT};font-size:0.7em;letter-spacing:0.32em;text-transform:uppercase;color:${muted};padding-left:0.32em}`,
    `${s} > [data-pica-headline]{width:min(46rem,100%);font-size:clamp(2rem,7vw,4.5rem);font-weight:800;line-height:1.02;text-transform:uppercase;text-wrap:balance}`,
    `${s} > [data-pica-subhead]{width:min(46rem,100%);font-size:clamp(1rem,1.6vw,1.2rem);font-style:italic;line-height:1.5}`,
    `${s} > [data-pica-rule]{display:flex;align-items:center;gap:0.85em;width:min(46rem,100%);margin:0.85em 0}`,
    `${s} > [data-pica-rule] [data-pica-line]{flex:1;height:1px;background:${muted}}`,
    `${s} > [data-pica-rule] [data-pica-gem]{font-family:${GRID_FONT};font-size:0.72em;line-height:1;white-space:pre;color:${accent};text-align:center}`,
    `${s} > :not([data-pica]){width:min(46rem,100%);color:${muted};font-size:0.95em;line-height:1.75}`,
    `${s} > [data-pica-actions]{display:flex;flex-wrap:wrap;justify-content:${centered ? "center" : "flex-start"};gap:0.8em;width:min(46rem,100%)}`,
    `${s} > [data-pica-actions]:empty{display:none}`,
    `${s} > [data-pica-actions] a{appearance:none;text-decoration:none;font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.16em;text-transform:uppercase;line-height:1.35;padding:0.75em 1.3em;color:${fg};border:1px solid ${fg};border-radius:0;cursor:pointer}`,
    `${s} > [data-pica-actions] a[data-variant="lead"]{border:3px double ${fg}}`,
    `${s} > [data-pica-actions] a:hover{color:${accent};border-color:${accent}}`,
    `${s} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<VictorianHeroProps> = (host, initial = {}) => {
  let props: VictorianHeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const under = layer(host, "under");
  const grid = createGrid(
    under.el,
    { fontFamily: GRID_FONT, fontSize: 14, lineHeight: 1, columns: 0, renderer: "dom", color: "" },
    draw,
  );

  const kickerEl = part("kicker", "p");
  const headlineEl = part("headline", "h1");
  const subheadEl = part("subhead", "p");
  const actionsEl = part("actions");
  let ruleNodes: HTMLElement[] = [];

  function draw(): void {
    drawFrame(grid, props);
  }

  /** Rebuilds the action links from JSON: at most three, the first under a doubled rule. */
  function renderActions(): void {
    actionsEl.replaceChildren();
    for (const [i, action] of props.actions.slice(0, 3).entries()) {
      const a = document.createElement("a");
      a.setAttribute("data-pica", "");
      if (i === 0) a.dataset.variant = "lead";
      a.href = action.href || "#";
      a.textContent = action.label;
      actionsEl.append(a);
    }
  }

  /** Rebuilds the bill: its own lines before the wrapped children, the calls to action after them, and
   *  a single rule between every two neighbours and at the ends, so every line sits boxed the way a
   *  playbill prints it. Children are never moved or touched; the rules land around them. */
  function syncStack(): void {
    kickerEl.textContent = props.kicker;
    headlineEl.textContent = props.headline;
    subheadEl.textContent = props.subhead;
    for (const rule of ruleNodes) rule.remove();
    ruleNodes = [];
    const seq: (HTMLElement | "children")[] = [];
    if (props.kicker.trim()) seq.push(kickerEl);
    if (props.headline.trim()) seq.push(headlineEl);
    if (props.subhead.trim()) seq.push(subheadEl);
    if (hasChildren(host)) seq.push("children");
    if (actionsEl.childElementCount > 0) seq.push(actionsEl);
    const before: HTMLElement[] = [];
    const after: HTMLElement[] = [];
    let seen = false;
    const emit = (node: HTMLElement): void => {
      (seen ? after : before).push(node);
    };
    const rule = (): HTMLElement => {
      const node = makeRule();
      ruleNodes.push(node);
      return node;
    };
    if (seq.length > 0) emit(rule());
    for (const [i, item] of seq.entries()) {
      if (i > 0) emit(rule());
      if (item === "children") seen = true;
      else emit(item);
    }
    if (seq.length > 0) emit(rule());
    host.prepend(...before);
    host.append(...after);
  }

  sheet.setRules(rules(sheet.selector, props));
  renderActions();
  syncStack();
  draw();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.align !== before.align || props.minHeight !== before.minHeight || props.frame !== before.frame) {
        sheet.setRules(rules(sheet.selector, props));
      }
      if (props.frame !== before.frame) draw();
      const actionsChanged = !sameJson(before.actions, props.actions);
      if (actionsChanged) renderActions();
      if (actionsChanged || changed(before, props, ["kicker", "headline", "subhead"])) syncStack();
    },
    destroy() {
      grid.destroy();
      under.remove();
      for (const rule of ruleNodes) rule.remove();
      for (const node of [kickerEl, headlineEl, subheadEl, actionsEl]) node.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
