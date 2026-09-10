import { labelHost, unlabelHost } from "../../../lib/a11y";
import { inkColor, parseColor } from "../../../lib/color";
import { createSampler } from "../../../lib/sample";
import { litSphere } from "../../../lib/subject";
import type { Mount } from "../../../lib/types";

export interface DuotoneImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** Flat tone bands the image's ink is quantized into. */
  levels: number;
  /** Draws the band with the most ink in --pica-accent instead of the host's ink color. */
  accent: boolean;
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
}

export const defaults: DuotoneImageProps = {
  src: "",
  alt: "",
  levels: 4,
  accent: false,
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
};

/** The accent ink the brightest band draws in, read from the host's own cascade with STYLE.md's amber as the fallback. */
function accentInk(host: HTMLElement): string {
  const custom = getComputedStyle(host).getPropertyValue("--pica-accent").trim();
  return custom || "#e8a020";
}

export const mount: Mount<DuotoneImageProps> = (host, initial = {}) => {
  let props: DuotoneImageProps = { ...defaults, ...initial };
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

  function draw(): void {
    // Native pixel resolution, capped, so posterized edges stay crisp rather than a blurred upscale.
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const cols = Math.max(1, Math.round(host.clientWidth * dpr));
    const rows = Math.max(1, Math.round(host.clientHeight * dpr));
    canvas.width = cols;
    canvas.height = rows;
    if (ctx && source && !failed) {
      const ink = sampler.sample(source, sourceW, sourceH, host, {
        cols, rows, aspect: 1, n: 1, fit: props.fit, tone: props.tone, contrast: props.contrast, mirror: false,
      });
      // The top band is the one with the most ink: fully opaque, and the accent band when accent is on.
      const maxBand = Math.max(1, props.levels - 1);
      const [r, g, b, a] = parseColor(inkColor(host));
      const [ar, ag, ab] = props.accent ? parseColor(accentInk(host)) : [r, g, b];
      const image = ctx.createImageData(cols, rows);
      for (let i = 0; i < ink.length; i++) {
        const band = Math.min(maxBand, Math.floor((ink[i] ?? 0) * props.levels));
        const brightest = props.accent && band === maxBand;
        const j = i * 4;
        image.data[j] = brightest ? ar : r;
        image.data[j + 1] = brightest ? ag : g;
        image.data[j + 2] = brightest ? ab : b;
        image.data[j + 3] = Math.round((band / maxBand) * a);
      }
      ctx.putImageData(image, 0, 0);
    } else if (ctx) {
      ctx.clearRect(0, 0, cols, rows);
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
