"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Halftone CSS · halftone-css
// MIT + Commons Clause · https://github.com/rishabbalak/pica/blob/main/LICENSE.md
// Docs and credits: https://github.com/rishabbalak/pica

// lib/types.ts
/** The contract every Pica core implements. See docs/architecture/contract.md. */

/** A mounted component. */
interface PicaInstance<P> {
  /** Merge new prop values. The core decides what has to be rebuilt. */
  update(props: Partial<P>): void;
  /** Stop all work and remove everything the core added. Safe to call twice. */
  destroy(): void;
}

/** Mounts a core into a host element. Props are plain data: strings, numbers, booleans, null. */
type Mount<P> = (host: HTMLElement, props?: Partial<P>) => PicaInstance<P>;

/** Props every animated core accepts, so captures and reduced motion behave the same everywhere. */
interface MotionProps {
  /** Stop animating and hold the current frame. */
  paused: boolean;
  /** Render exactly this animation time, in milliseconds, and do not animate. Null animates. */
  time: number | null;
  /** Seed for every random choice, so the same seed always draws the same frame. */
  seed: number;
}

// lib/use-pica.ts
/** Mounts a Pica core into the returned ref and forwards prop changes to it.
 *  Props are plain data by contract, so a JSON key is enough to detect a change. */
function usePica<P>(mount: Mount<P>, props: Partial<P>) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<PicaInstance<P> | null>(null);
  const defined = definedProps(props);
  const latest = useRef(defined);
  latest.current = defined;
  const key = JSON.stringify(defined);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const mounted = mount(host, latest.current);
    instance.current = mounted;
    return () => {
      mounted.destroy();
      instance.current = null;
    };
  }, [mount]);

  useEffect(() => {
    instance.current?.update(latest.current);
  }, [key]);

  return ref;
}

/** Drops undefined values, so an unset prop keeps the core's default. */
function definedProps<P>(props: Partial<P>): Partial<P> {
  const out: Partial<P> = {};
  for (const name in props) {
    const value = props[name];
    if (value !== undefined) out[name] = value;
  }
  return out;
}

// lib/a11y.ts
/** Accessibility attributes a core sets on its host. See docs/architecture/contract.md, mount step 2. */

/** Gives the host a role and a label, or hides it from assistive technology when the label is empty. */
function labelHost(host: HTMLElement, label: string, role = "img"): void {
  if (label) {
    host.setAttribute("role", role);
    host.setAttribute("aria-label", label);
    host.removeAttribute("aria-hidden");
  } else {
    host.removeAttribute("role");
    host.removeAttribute("aria-label");
    host.setAttribute("aria-hidden", "true");
  }
}

/** Removes what labelHost set. */
function unlabelHost(host: HTMLElement): void {
  host.removeAttribute("role");
  host.removeAttribute("aria-label");
  host.removeAttribute("aria-hidden");
}

/** A visually hidden element that carries text for assistive technology, for components whose visible text
 *  animates. Put the animated layer next to it with aria-hidden. */
function hiddenText(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = text;
  span.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
  return span;
}

// registry/effects/halftone-css/core.ts
export interface HalftoneCssProps {
  /** Spacing between dots, in pixels. */
  size: number;
  /** Dot radius, as a fraction of size. At 0.5 dots in the same layer touch their neighbors. */
  dot: number;
  /** How the dots fade across the host. "none" keeps their strength uniform. */
  fade: "radial" | "linear" | "none";
  /** Direction of the linear fade, in degrees. Used only when fade is "linear". */
  angle: number;
  /** How strongly the dots show, from faint to fully inked. */
  strength: number;
}

export const defaults: HalftoneCssProps = {
  size: 14,
  dot: 0.28,
  fade: "radial",
  angle: 45,
  strength: 0.6,
};

/** Counts instances so each one gets its own class, never repeated while the page is open. */
let instances = 0;

export const mount: Mount<HalftoneCssProps> = (host, initial = {}) => {
  let props: HalftoneCssProps = { ...defaults, ...initial };
  const className = `pica-halftone-css-${++instances}`;
  const reposition = getComputedStyle(host).position === "static";
  const style = document.createElement("style");
  const layer = document.createElement("div");
  layer.className = className;

  labelHost(host, "");
  if (reposition) host.style.position = "relative";
  style.textContent = sheet(className, props);
  host.appendChild(style);
  host.appendChild(layer);
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      style.textContent = sheet(className, props);
    },
    destroy() {
      style.remove();
      layer.remove();
      unlabelHost(host);
      if (reposition) host.style.removeProperty("position");
      delete host.dataset.picaReady;
    },
  };
};

/** The scoped rule for one instance: a dot grid plus a second layer offset by half a cell, masked by an
 *  optional fade. Both layers live in one element's background-image, so only one div is ever added. */
function sheet(className: string, p: HalftoneCssProps): string {
  const radius = p.size * p.dot;
  const half = p.size / 2;
  const dot = `radial-gradient(circle at center, var(--pica-fg, currentColor) ${radius}px, transparent ${radius}px)`;
  const mask = maskImage(p.fade, p.angle);
  const rules = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    `background-image:${dot},${dot}`,
    `background-size:${p.size}px ${p.size}px,${p.size}px ${p.size}px`,
    `background-position:0 0,${half}px ${half}px`,
    `opacity:${p.strength}`,
  ];
  if (mask) {
    rules.push(
      `-webkit-mask-image:${mask}`,
      `mask-image:${mask}`,
      "-webkit-mask-repeat:no-repeat",
      "mask-repeat:no-repeat",
      "-webkit-mask-size:100% 100%",
      "mask-size:100% 100%",
    );
  }
  return `.${className}{${rules.join(";")}}`;
}

/** The mask-image value for one fade mode, or an empty string when the pattern should stay uniform. */
function maskImage(fade: HalftoneCssProps["fade"], angle: number): string {
  if (fade === "radial") return "radial-gradient(circle at center, #000 0%, transparent 100%)";
  if (fade === "linear") return `linear-gradient(${angle}deg, #000 0%, transparent 100%)`;
  return "";
}

// registry/effects/halftone-css/index.tsx
export interface HalftoneCssComponentProps extends Partial<HalftoneCssProps> {
  className?: string;
  style?: CSSProperties;
}

/** A halftone dot pattern drawn entirely in layered CSS gradients, for use as a background. */
export function HalftoneCss({ className, style, ...props }: HalftoneCssComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
