"use client";

import { type CSSProperties, useEffect, useRef } from "react";

// Pica · Halftone Image · halftone-image
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

// lib/color.ts
/** Reading colors from the page, so components inherit instead of impose. See STYLE.md, principle 4. */

let colorProbe: CanvasRenderingContext2D | null | undefined;

/** Any CSS color as [r, g, b, a], each 0 to 255. A color the browser cannot parse reads as transparent. */
function parseColor(color: string): [number, number, number, number] {
  if (colorProbe === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    colorProbe = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!colorProbe) return [0, 0, 0, 0];
  colorProbe.clearRect(0, 0, 1, 1);
  colorProbe.fillStyle = "rgba(0, 0, 0, 0)";
  colorProbe.fillStyle = color;
  colorProbe.fillRect(0, 0, 1, 1);
  const d = colorProbe.getImageData(0, 0, 1, 1).data;
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0];
}

/** WCAG relative luminance of a CSS color: 0 for black, 1 for white. */
function relativeLuminance(color: string): number {
  const [r, g, b] = parseColor(color);
  const linear = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The color glyphs are drawn in: --pica-fg when set, otherwise the host's inherited color. */
function inkColor(host: HTMLElement): string {
  const style = getComputedStyle(host);
  return style.getPropertyValue("--pica-fg").trim() || style.color;
}

/** Whether the host shows light glyphs on a dark ground or the reverse, read from computed colors. */
function hostTone(host: HTMLElement): "light-on-dark" | "dark-on-light" {
  const fg = relativeLuminance(inkColor(host));
  let bg = 1; // A page with no background set anywhere renders white.
  for (let el: HTMLElement | null = host; el; el = el.parentElement) {
    const background = getComputedStyle(el).backgroundColor;
    if (parseColor(background)[3] > 0) {
      bg = relativeLuminance(background);
      break;
    }
  }
  return fg > bg ? "light-on-dark" : "dark-on-light";
}

// lib/sample.ts
/** Turns any drawable (image, video frame, canvas) into ink values for a glyph grid. */

interface SampleOptions {
  cols: number;
  rows: number;
  /** Cell width over cell height, from the grid. */
  aspect: number;
  /** Samples per cell side: 1 for ramp picking, 3 for shape matching. */
  n: number;
  /** Samples per cell vertically, when it differs from `n`: braille cells are 2 wide by 4 tall. */
  ny?: number;
  fit: "cover" | "contain";
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** Contrast around mid grey. 1 leaves the source as it is. */
  contrast: number;
  /** Mirror horizontally, as a webcam preview expects. */
  mirror: boolean;
}

interface Sampler {
  /** Ink wanted at each sample, 0 to 1, row-major, (cols * n) wide by (rows * (ny ?? n)) tall. The buffer is reused. */
  sample(source: CanvasImageSource, sourceW: number, sourceH: number, host: HTMLElement, options: SampleOptions): Float32Array;
}

function createSampler(): Sampler {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let ink = new Float32Array(0);

  return {
    sample(source, sourceW, sourceH, host, o) {
      const ny = o.ny ?? o.n;
      const sw = o.cols * o.n;
      const sh = o.rows * ny;
      if (ink.length !== sw * sh) ink = new Float32Array(sw * sh);
      if (!ctx || sourceW <= 0 || sourceH <= 0) return ink.fill(0);
      if (canvas.width !== sw) canvas.width = sw;
      if (canvas.height !== sh) canvas.height = sh;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, sw, sh);
      if (o.mirror) ctx.setTransform(-1, 0, 0, 1, sw, 0);
      // Work in cell units, where a cell is `aspect` wide and 1 tall, then convert to sample pixels.
      const boxW = o.cols * o.aspect;
      const boxH = o.rows;
      const scale = o.fit === "cover"
        ? Math.max(boxW / sourceW, boxH / sourceH)
        : Math.min(boxW / sourceW, boxH / sourceH);
      const drawW = sourceW * scale;
      const drawH = sourceH * scale;
      const toX = o.n / o.aspect;
      ctx.drawImage(source, ((boxW - drawW) / 2) * toX, ((boxH - drawH) / 2) * ny, drawW * toX, drawH * ny);
      const data = ctx.getImageData(0, 0, sw, sh).data;
      const lightOnDark = (o.tone === "auto" ? hostTone(host) : o.tone) === "light-on-dark";
      for (let p = 0; p < sw * sh; p++) {
        const i = p * 4;
        const alpha = (data[i + 3] ?? 0) / 255;
        const luma = (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255;
        // Contrast acts on perceived brightness; the result goes to linear light, because glyph coverage
        // mixes with the ground linearly.
        const linear = Math.min(1, Math.max(0, (luma - 0.5) * o.contrast + 0.5)) ** 2.2;
        ink[p] = alpha * (lightOnDark ? linear : 1 - linear);
      }
      return ink;
    },
  };
}

// lib/subject.ts
/** The built-in subject image components draw when given no source: a sphere lit from one side, drawn
 *  locally so nothing is fetched. Animated components move the light by passing its position. */
function litSphere(size = 256, lightX = 0.36, lightY = 0.34): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const light = ctx.createRadialGradient(size * lightX, size * lightY, size * 0.02, size * 0.5, size * 0.5, size * 0.46);
    light.addColorStop(0, "#ffffff");
    light.addColorStop(0.55, "#8a8a8a");
    light.addColorStop(1, "#141414");
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

// registry/dither/halftone-image/core.ts
export interface HalftoneImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** Grid spacing in CSS pixels: the distance between dot centers. */
  cell: number;
  /** Rotation of the dot grid, in degrees. 45 gives the classic printing screen angle. */
  angle: number;
  /** Dot shape. "circle" and "square" sit on the grid; "line" draws a rotated line screen for an engraving look. */
  shape: "circle" | "square" | "line";
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" screens the bright pixels; "dark-on-light" screens the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
}

export const defaults: HalftoneImageProps = {
  src: "",
  alt: "",
  cell: 10,
  angle: 45,
  shape: "circle",
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
};

/** Circle radius at full ink, as a share of `cell`. High enough that neighboring dots overlap and
 *  shadows read as nearly solid, without needing a second pass to merge them. */
const MAX_CIRCLE = 0.56;

export const mount: Mount<HalftoneImageProps> = (host, initial = {}) => {
  let props: HalftoneImageProps = { ...defaults, ...initial };
  let source: CanvasImageSource | null = null;
  let sourceW = 0;
  let sourceH = 0;
  let failed = false;
  let request = 0;
  let setAspect = false;
  const sampler = createSampler();
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";
  host.appendChild(canvas);

  function load(): void {
    const mine = ++request;
    failed = false;
    if (!props.src) {
      use(litSphere(), 256, 256);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (mine === request) use(img, img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      if (mine !== request) return;
      source = null;
      failed = true;
      draw();
    };
    img.src = props.src;
  }

  function use(next: CanvasImageSource, w: number, h: number): void {
    source = next;
    sourceW = w;
    sourceH = h;
    // A host with no height of its own takes the image's proportions.
    if (host.clientHeight < 2 && w > 0 && h > 0) {
      host.style.aspectRatio = `${w} / ${h}`;
      setAspect = true;
    }
    draw();
  }

  /** Adds a rectangle centered at (cx, cy) to the current path, `halfU` and `halfV` out along the
   *  grid's own rotated axes, so squares and lines turn with the screen angle. */
  function addQuad(cx: number, cy: number, halfU: number, halfV: number, cosA: number, sinA: number): void {
    if (!ctx) return;
    const ux = halfU * cosA;
    const uy = halfU * sinA;
    const vx = -halfV * sinA;
    const vy = halfV * cosA;
    ctx.moveTo(cx - ux - vx, cy - uy - vy);
    ctx.lineTo(cx + ux - vx, cy + uy - vy);
    ctx.lineTo(cx + ux + vx, cy + uy + vy);
    ctx.lineTo(cx - ux + vx, cy - uy + vy);
    ctx.closePath();
  }

  function draw(): void {
    const w = host.clientWidth;
    const h = host.clientHeight;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ctx && source && !failed) {
      const cell = props.cell > 0 ? props.cell : 1;
      const cols = Math.max(1, Math.round(w / cell));
      const rows = Math.max(1, Math.round(h / cell));
      const ink = sampler.sample(source, sourceW, sourceH, host, {
        cols, rows, aspect: 1, n: 1, fit: props.fit, tone: props.tone, contrast: props.contrast, mirror: false,
      });
      // The dot grid is a rotated lattice: u and v are its two axes, each `cell` long.
      const angleRad = (props.angle * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const corners: [number, number][] = [[0, 0], [w, 0], [0, h], [w, h]];
      let iMin = Infinity;
      let iMax = -Infinity;
      let jMin = Infinity;
      let jMax = -Infinity;
      for (const [cx, cy] of corners) {
        const gi = (cx * cosA + cy * sinA) / cell;
        const gj = (-cx * sinA + cy * cosA) / cell;
        if (gi < iMin) iMin = gi;
        if (gi > iMax) iMax = gi;
        if (gj < jMin) jMin = gj;
        if (gj > jMax) jMax = gj;
      }
      iMin = Math.floor(iMin) - 1;
      iMax = Math.ceil(iMax) + 1;
      jMin = Math.floor(jMin) - 1;
      jMax = Math.ceil(jMax) + 1;
      ctx.fillStyle = inkColor(host);
      ctx.beginPath();
      for (let i = iMin; i <= iMax; i++) {
        for (let j = jMin; j <= jMax; j++) {
          const x = i * cell * cosA - j * cell * sinA;
          const y = i * cell * sinA + j * cell * cosA;
          if (x < -cell || x > w + cell || y < -cell || y > h + cell) continue;
          // Bilinear lookup: the ink buffer has one sample per cell, laid out on the host's own axes.
          const bx = Math.min(cols - 1, Math.max(0, x / cell));
          const by = Math.min(rows - 1, Math.max(0, y / cell));
          const x0 = Math.floor(bx);
          const y0 = Math.floor(by);
          const x1 = Math.min(cols - 1, x0 + 1);
          const y1 = Math.min(rows - 1, y0 + 1);
          const tx = bx - x0;
          const ty = by - y0;
          const v00 = ink[y0 * cols + x0] ?? 0;
          const v10 = ink[y0 * cols + x1] ?? 0;
          const v01 = ink[y1 * cols + x0] ?? 0;
          const v11 = ink[y1 * cols + x1] ?? 0;
          const raw = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
          const v = Math.min(1, Math.max(0, raw));
          if (v <= 0.004) continue;
          // Area, not radius, carries the tone: the covered area grows in step with ink, so a mid
          // grey covers about half of each cell instead of a quarter of it.
          if (props.shape === "circle") {
            const r = cell * MAX_CIRCLE * Math.sqrt(v);
            if (r < 0.15) continue;
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
          } else if (props.shape === "square") {
            const half = (cell * Math.sqrt(v)) / 2;
            if (half < 0.1) continue;
            addQuad(x, y, half, half, cosA, sinA);
          } else {
            const halfV = (cell * v) / 2;
            if (halfV < 0.1) continue;
            addQuad(x, y, cell / 2, halfV, cosA, sinA);
          }
        }
      }
      ctx.fill();
    }
    if (source || failed) host.dataset.picaReady = "true";
  }

  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => draw()) : null;
  resizeObserver?.observe(host);

  labelHost(host, props.alt);
  load();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      labelHost(host, props.alt);
      if (props.src !== before.src) load();
      else draw();
    },
    destroy() {
      request++;
      resizeObserver?.disconnect();
      canvas.remove();
      unlabelHost(host);
      if (setAspect) host.style.removeProperty("aspect-ratio");
      delete host.dataset.picaReady;
    },
  };
};

// registry/dither/halftone-image/index.tsx
export interface HalftoneImageComponentProps extends Partial<HalftoneImageProps> {
  className?: string;
  style?: CSSProperties;
}

/** An image screened into halftone dots, squares, or lines, drawn on a canvas in the host's ink color. */
export function HalftoneImage({ className, style, ...props }: HalftoneImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
