import * as asciiNoiseField from "../../ascii/ascii-noise-field/core";
import * as meshGradient from "../../shaders/mesh-gradient/core";
import { layer, scope, styleHost, type Layer } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount, MotionProps } from "../../../lib/types";

export interface HeroAction {
  /** Text on the link. */
  label: string;
  /** Where the link points. */
  href: string;
}

export interface HeroProps extends MotionProps {
  /** What draws behind the content: a mesh gradient, a drifting ASCII noise field, or nothing. */
  background: "mesh" | "noise" | "none";
  /** Calls to action, drawn as links. The first draws solid in the accent, the rest draw outline. */
  actions: readonly HeroAction[];
  /** Horizontal alignment of the content column within the host. */
  align: "start" | "center";
  /** The host's minimum height, in percent of the viewport height. */
  minHeight: number;
  /** How strongly the background shows, from 0 to 1, passed through to whichever one is mounted. */
  intensity: number;
}

export const defaults: HeroProps = {
  background: "mesh",
  actions: [
    { label: "Browse components", href: "#components" },
    { label: "Read the docs", href: "#docs" },
  ],
  align: "start",
  minHeight: 60,
  intensity: 0.6,
  paused: false,
  time: null,
  seed: 1,
};

/** Keeps minHeight inside a sane range even if a caller passes something outside 30 to 100. */
function vh(minHeight: number): number {
  return Math.min(100, Math.max(0, minHeight));
}

/** Maps the 0 to 1 intensity onto ascii-noise-field's contrast range, since that field has no intensity
 *  prop of its own: raising contrast pushes its tone toward a threshold, which reads as a more present field. */
function noiseContrast(intensity: number): number {
  return 0.6 + Math.min(1, Math.max(0, intensity)) * 1.8;
}

/** Props for the mesh background: intensity passes straight through, everything else keeps its own defaults. */
function meshProps(p: HeroProps): Partial<typeof meshGradient.defaults> {
  return { paused: p.paused, time: p.time, seed: p.seed, intensity: p.intensity };
}

/** Props for the noise background: intensity becomes contrast, the closest knob that field has. */
function noiseProps(p: HeroProps): Partial<typeof asciiNoiseField.defaults> {
  return { paused: p.paused, time: p.time, seed: p.seed, contrast: noiseContrast(p.intensity) };
}

/** The mounted background, tagged by kind so each core's own update stays correctly typed. */
type Background =
  | { kind: "none" }
  | { kind: "mesh"; layer: Layer; instance: ReturnType<typeof meshGradient.mount> }
  | { kind: "noise"; layer: Layer; instance: ReturnType<typeof asciiNoiseField.mount> };

/** Mounts the chosen background into a fresh under layer of its own. */
function mountBackground(kind: "mesh" | "noise", host: HTMLElement, p: HeroProps): Background {
  const bgLayer = layer(host, "under");
  if (kind === "mesh") return { kind, layer: bgLayer, instance: meshGradient.mount(bgLayer.el, meshProps(p)) };
  return { kind, layer: bgLayer, instance: asciiNoiseField.mount(bgLayer.el, noiseProps(p)) };
}

function destroyBackground(bg: Background): void {
  if (bg.kind === "none") return;
  bg.instance.destroy();
  bg.layer.remove();
}

/** Layout for the host and the button grammar for its calls to action, from STYLE.md: the first action
 *  solid in the accent, the rest outline, square corners, and a hairline focus ring. Height and min-height
 *  are set as inline styles instead, so they are not shadowed by an outer page's own rules for the host. */
function rules(selector: string, p: HeroProps): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const edge = p.align === "center" ? "center" : "flex-start";
  const textAlign = p.align === "center" ? "center" : "start";
  return [
    `${selector}{position:relative;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${edge};padding:clamp(1.5rem, 5vw, 4rem);gap:0.6em}`,
    `${selector} > :not([data-pica]){max-width:40rem;text-align:${textAlign}}`,
    `${selector} > [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em;max-width:40rem;margin-top:0.6em;justify-content:${edge}}`,
    `${selector} > [data-pica-actions]:empty{display:none}`,
    `${selector} > [data-pica-actions] a{appearance:none;text-decoration:none;font:inherit;font-size:0.95em;line-height:1.2;padding:0.6em 1.25em;display:inline-flex;align-items:center;border:1px solid transparent;border-radius:0;cursor:pointer}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]{background:${accent};color:${cssOn("accent")}}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]{background:transparent;color:${fg};border-color:${fg}}`,
    `${selector} > [data-pica-actions] a[data-variant="solid"]:hover{background:color-mix(in srgb, ${accent} 85%, ${fg})}`,
    `${selector} > [data-pica-actions] a[data-variant="outline"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} > [data-pica-actions] a:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

/** Rebuilds the action links from JSON: the first solid, the rest outline, in source order. */
function renderActions(container: HTMLElement, actions: readonly HeroAction[]): void {
  container.replaceChildren();
  for (const [i, action] of actions.entries()) {
    const a = document.createElement("a");
    a.setAttribute("data-pica", "");
    a.dataset.variant = i === 0 ? "solid" : "outline";
    a.href = action.href;
    a.textContent = action.label;
    container.append(a);
  }
}

export const mount: Mount<HeroProps> = (host, initial = {}) => {
  let props: HeroProps = { ...defaults, ...initial };
  const sheet = scope(host);
  // Auto height plus an explicit min-height, as inline styles: a page that gives this host a height of its
  // own still wins (inline beats any stylesheet), and a plain block host sizes from its own content and
  // this floor, exactly like a hero placed in normal page flow.
  const restoreSize = styleHost(host, { height: "auto", "min-height": `${vh(props.minHeight)}vh` });

  const actions = document.createElement("div");
  actions.setAttribute("data-pica", "");
  actions.setAttribute("data-pica-actions", "");
  host.append(actions);

  let bg: Background = props.background === "none" ? { kind: "none" } : mountBackground(props.background, host, props);

  sheet.setRules(rules(sheet.selector, props));
  renderActions(actions, props.actions);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };

      if (props.background !== before.background) {
        destroyBackground(bg);
        bg = props.background === "none" ? { kind: "none" } : mountBackground(props.background, host, props);
      } else if (bg.kind === "mesh") {
        if (
          props.paused !== before.paused ||
          props.time !== before.time ||
          props.seed !== before.seed ||
          props.intensity !== before.intensity
        ) {
          bg.instance.update(meshProps(props));
        }
      } else if (bg.kind === "noise") {
        if (
          props.paused !== before.paused ||
          props.time !== before.time ||
          props.seed !== before.seed ||
          props.intensity !== before.intensity
        ) {
          bg.instance.update(noiseProps(props));
        }
      }

      if (props.minHeight !== before.minHeight) host.style.setProperty("min-height", `${vh(props.minHeight)}vh`);
      if (props.align !== before.align) sheet.setRules(rules(sheet.selector, props));
      if (!sameJson(before.actions, props.actions)) renderActions(actions, props.actions);
    },
    destroy() {
      destroyBackground(bg);
      actions.remove();
      sheet.destroy();
      restoreSize();
      delete host.dataset.picaReady;
    },
  };
};
