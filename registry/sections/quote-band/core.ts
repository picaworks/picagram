import * as dotLattice from "../../patterns/dot-lattice/core";
import { GRID_FONT } from "../../../lib/font";
import { layer, scope, type Layer } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface QuoteBandProps {
  /** The quoted words, set large across the band. */
  quote: string;
  /** Who said it. */
  name: string;
  /** Their role, shown beside the name in uppercase mono. */
  role: string;
  /** Where the quote comes from. A non empty value makes the name a link and sets the blockquote's cite. */
  href: string;
  /** "start" sets the quote beside a gutter hairline. "center" drops the gutter and centers the type. */
  align: "start" | "center";
  /** A quiet dot lattice behind the band, or nothing. */
  background: "dots" | "none";
  /** Opacity of the dot lattice, from 0 to 0.6. */
  strength: number;
}

export const defaults: QuoteBandProps = {
  quote: "A good section does not announce itself. It makes the page around it easier to read.",
  name: "Ines Calder",
  role: "Design lead, Fieldwork",
  href: "",
  align: "start",
  background: "dots",
  strength: 0.2,
};

/** Keeps the lattice strength inside the range the inspector offers. */
function clampStrength(strength: number): number {
  return Math.min(0.6, Math.max(0, strength));
}

/** Props for the composed lattice: fine spacing, and a fade so the dots thin toward the band's edges. */
function latticeProps(p: QuoteBandProps): Partial<typeof dotLattice.defaults> {
  return { spacing: 20, dot: 1, fade: 0.85, strength: clampStrength(p.strength) };
}

/** An element marked as this core's own, with a data-pica value the scoped stylesheet selects by. */
function node<K extends keyof HTMLElementTagNameMap>(tag: K, kind?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", kind ?? "");
  return el;
}

/** The scoped rules. The flow minimum sits in a :where() rule, so a page that sizes the host wins. The figure
 *  is a container, so the layout answers to the host's own width rather than the viewport's. */
function rules(s: string, p: QuoteBandProps): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const line = `color-mix(in srgb, ${fg} 35%, transparent)`;
  const center = p.align === "center";
  return [
    `:where(${s}){min-height:18rem}`,
    `${s}{box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;padding-block:clamp(1.5rem,4vw,3rem)}`,
    `${s} > :not([data-pica]){margin:0 0 1.25rem;padding-inline:clamp(1.5rem,5vw,4rem)}`,
    `${s} > figure[data-pica]{position:relative;container-type:inline-size;margin:0;border-block:1px solid ${line}}`,
    `${s} [data-pica="band"]{display:grid;grid-template-columns:${center ? "minmax(0,1fr)" : "1px minmax(0,1fr)"};column-gap:clamp(1.5rem,4vw,3rem);padding:clamp(2.5rem,6vw,4.5rem) clamp(1.5rem,5vw,4rem)}`,
    `${s} [data-pica="gutter"]{display:${center ? "none" : "block"};background:linear-gradient(to bottom,${accent} 0 2rem,${line} 2rem 100%)}`,
    `${s} [data-pica="body"]{min-width:0;display:flex;flex-direction:column;gap:clamp(1.25rem,3vw,2rem);${center ? "align-items:center;text-align:center" : ""}}`,
    `${s} blockquote{margin:0;max-width:14em;font-size:clamp(1.75rem,1.2rem + 2.4vw,3rem);line-height:1.2;text-wrap:balance;overflow-wrap:break-word;color:${fg}}`,
    `${s} figcaption{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem 1rem;${center ? "justify-content:center" : ""}}`,
    `${s} [data-pica="rule"]{flex:none;width:2rem;overflow:hidden;white-space:nowrap;font-family:${GRID_FONT};line-height:1;color:${muted}}`,
    `${s} [data-pica="name"]{font-size:1rem;color:${fg}}`,
    `${s} a[data-pica="name"]{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:0.25em}`,
    `${s} a[data-pica="name"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} a[data-pica="name"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${s} [data-pica="role"]{font-family:${GRID_FONT};font-size:0.75rem;letter-spacing:0.04em;text-transform:uppercase;color:${muted}}`,
    `@container (max-width:640px){${s} [data-pica="band"]{grid-template-columns:minmax(0,1fr);row-gap:1.5rem}`,
    `${s} [data-pica="gutter"]{height:1px;background:linear-gradient(to right,${accent} 0 2rem,${line} 2rem 100%)}`,
    `${s} figcaption{flex-direction:column;align-items:${center ? "center" : "flex-start"};gap:0.5rem}}`,
  ].join("\n");
}

/** Fills the body with the blockquote and figcaption. The quotation marks are aria-hidden spans, so
 *  assistive technology reads the quote and not the marks. */
function renderBody(body: HTMLElement, p: QuoteBandProps): void {
  const quote = node("blockquote");
  if (p.href) quote.setAttribute("cite", p.href);
  const open = node("span", "mark");
  open.setAttribute("aria-hidden", "true");
  open.textContent = "“";
  const text = node("span", "text");
  text.textContent = p.quote;
  const close = node("span", "mark");
  close.setAttribute("aria-hidden", "true");
  close.textContent = "”";
  quote.append(open, text, close);

  const caption = node("figcaption");
  const rule = node("span", "rule");
  rule.setAttribute("aria-hidden", "true");
  rule.textContent = "─".repeat(6);
  caption.append(rule);
  if (p.name) {
    if (p.href) {
      const link = node("a", "name");
      link.href = p.href;
      link.textContent = p.name;
      caption.append(link);
    } else {
      const who = node("span", "name");
      who.textContent = p.name;
      caption.append(who);
    }
  }
  if (p.role) {
    const role = node("span", "role");
    role.textContent = p.role;
    caption.append(role);
  }
  body.replaceChildren(quote, caption);
}

/** The mounted lattice and the layer it sits in. */
interface Lattice {
  layer: Layer;
  instance: ReturnType<typeof dotLattice.mount>;
}

export const mount: Mount<QuoteBandProps> = (host, initial = {}) => {
  let props: QuoteBandProps = { ...defaults, ...initial };
  const sheet = scope(host);

  const figure = node("figure");
  const band = node("div", "band");
  const gutter = node("div", "gutter");
  gutter.setAttribute("aria-hidden", "true");
  const body = node("div", "body");
  band.append(gutter, body);
  figure.append(band);
  host.append(figure);

  let lattice: Lattice | null = null;
  const mountLattice = (): void => {
    const under = layer(figure, "under");
    lattice = { layer: under, instance: dotLattice.mount(under.el, latticeProps(props)) };
  };
  const destroyLattice = (): void => {
    if (!lattice) return;
    lattice.instance.destroy();
    lattice.layer.remove();
    lattice = null;
  };

  if (props.background === "dots") mountLattice();
  sheet.setRules(rules(sheet.selector, props));
  renderBody(body, props);
  host.dataset.picaReady = "true";

  let destroyed = false;
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (props.background !== before.background) {
        destroyLattice();
        if (props.background === "dots") mountLattice();
      } else if (lattice && props.strength !== before.strength) {
        lattice.instance.update(latticeProps(props));
      }
      if (props.align !== before.align) sheet.setRules(rules(sheet.selector, props));
      if (
        props.quote !== before.quote ||
        props.name !== before.name ||
        props.role !== before.role ||
        props.href !== before.href
      ) {
        renderBody(body, props);
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      destroyLattice();
      figure.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
