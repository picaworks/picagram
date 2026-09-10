import { labelHost, unlabelHost } from "../../../lib/a11y";
import { hostTone, inkColor, parseColor } from "../../../lib/color";
import { litSphere } from "../../../lib/subject";
import type { Mount } from "../../../lib/types";

export interface PixelSortProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** The line the sort runs along: horizontal rows or vertical columns. */
  direction: "horizontal" | "vertical";
  /** Lower brightness bound, 0 to 1. A pixel at or below it ends a run instead of joining it. */
  low: number;
  /** Upper brightness bound, 0 to 1. A pixel at or above it ends a run instead of joining it. */
  high: number;
  /** Keeps the source's own colors. Off renders one ink tone by luminance instead. */
  color: boolean;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. Has no effect when color is true. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
}

export const defaults: PixelSortProps = {
  src: "",
  alt: "",
  direction: "horizontal",
  low: 0.25,
  high: 0.8,
  color: false,
  fit: "cover",
  tone: "auto",
};

/** Longest side, in pixels, the source is downscaled to before sorting, so the one-time sort stays fast. */
const WORK_MAX = 480;

/** Font the fallback note draws in, matching STYLE.md's grid stack. */
const NOTE_FONT = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

/** Perceptual brightness of one pixel, 0 to 1. */
function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Sorts pixels darkest to brightest within each run that clears `low` and stays under `high`, along rows
 *  (`vertical` false) or columns (`vertical` true). A pixel outside that band anchors the runs on either
 *  side of it and never moves itself. Mutates `data` in place. */
function sortPixels(data: Uint8ClampedArray, width: number, height: number, vertical: boolean, low: number, high: number): void {
  const count = width * height;
  const bright = new Float32Array(count);
  for (let p = 0; p < count; p++) {
    const o = p * 4;
    bright[p] = luma(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0);
  }
  const lines = vertical ? width : height;
  const length = vertical ? height : width;
  const at = (line: number, pos: number): number => (vertical ? pos * width + line : line * width + pos);
  // Scratch space for one run, reused across every line so sorting never allocates in the hot path.
  const order = new Uint32Array(length);
  const rTmp = new Uint8ClampedArray(length);
  const gTmp = new Uint8ClampedArray(length);
  const bTmp = new Uint8ClampedArray(length);
  const aTmp = new Uint8ClampedArray(length);

  for (let line = 0; line < lines; line++) {
    let start = -1;
    for (let pos = 0; pos <= length; pos++) {
      const value = pos < length ? bright[at(line, pos)] ?? 0 : 0;
      const inRun = pos < length && value > low && value < high;
      if (inRun) {
        if (start === -1) start = pos;
        continue;
      }
      if (start !== -1) {
        const n = pos - start;
        if (n > 1) {
          for (let i = 0; i < n; i++) order[i] = start + i;
          const run = order.subarray(0, n);
          run.sort((a, b) => (bright[at(line, a)] ?? 0) - (bright[at(line, b)] ?? 0));
          for (let i = 0; i < n; i++) {
            const src = at(line, run[i] ?? 0) * 4;
            rTmp[i] = data[src] ?? 0;
            gTmp[i] = data[src + 1] ?? 0;
            bTmp[i] = data[src + 2] ?? 0;
            aTmp[i] = data[src + 3] ?? 0;
          }
          for (let i = 0; i < n; i++) {
            const dst = at(line, start + i) * 4;
            data[dst] = rTmp[i] ?? 0;
            data[dst + 1] = gTmp[i] ?? 0;
            data[dst + 2] = bTmp[i] ?? 0;
            data[dst + 3] = aTmp[i] ?? 0;
          }
        }
        start = -1;
      }
    }
  }
}

/** Recolors already-sorted pixels to one ink tone by luminance, in place. */
function inkTint(data: Uint8ClampedArray, lightOnDark: boolean, ink: readonly [number, number, number, number]): void {
  const [ir, ig, ib, ia] = ink;
  const inkAlpha = ia / 255;
  for (let p = 0; p < data.length; p += 4) {
    const value = luma(data[p] ?? 0, data[p + 1] ?? 0, data[p + 2] ?? 0);
    const srcAlpha = (data[p + 3] ?? 0) / 255;
    data[p] = ir;
    data[p + 1] = ig;
    data[p + 2] = ib;
    data[p + 3] = (lightOnDark ? value : 1 - value) * srcAlpha * inkAlpha * 255;
  }
}

export const mount: Mount<PixelSortProps> = (host, initial = {}) => {
  let props: PixelSortProps = { ...defaults, ...initial };
  let source: CanvasImageSource | null = null;
  let sourceW = 0;
  let sourceH = 0;
  let failed = false;
  let request = 0;
  let setAspect = false;
  // The source, downscaled and sorted once. Redrawn straight from here for a resize, a color, or a tone change.
  let sorted: ImageData | null = null;

  const work = document.createElement("canvas");
  const workCtx = work.getContext("2d", { willReadFrequently: true });
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
      sorted = null;
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
    process();
  }

  /** Downscales the source and sorts it once. Only `draw` runs again for a resize or a color or tone change. */
  function process(): void {
    if (!workCtx || !source || sourceW <= 0 || sourceH <= 0) {
      sorted = null;
      draw();
      return;
    }
    const scale = Math.min(1, WORK_MAX / Math.max(sourceW, sourceH));
    const w = Math.max(1, Math.round(sourceW * scale));
    const h = Math.max(1, Math.round(sourceH * scale));
    work.width = w;
    work.height = h;
    workCtx.clearRect(0, 0, w, h);
    workCtx.drawImage(source, 0, 0, w, h);
    const image = workCtx.getImageData(0, 0, w, h);
    sortPixels(image.data, w, h, props.direction === "vertical", props.low, props.high);
    sorted = image;
    draw();
  }

  function draw(): void {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    if (!ctx) {
      if (source || failed) host.dataset.picaReady = "true";
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (failed) {
      const [r, g, b, a] = parseColor(inkColor(host));
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      ctx.font = `14px ${NOTE_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("image unavailable", w / 2, h / 2);
    } else if (sorted && workCtx) {
      if (props.color) {
        workCtx.putImageData(sorted, 0, 0);
      } else {
        const painted = new ImageData(new Uint8ClampedArray(sorted.data), sorted.width, sorted.height);
        const resolved = props.tone === "auto" ? hostTone(host) : props.tone;
        inkTint(painted.data, resolved === "light-on-dark", parseColor(inkColor(host)));
        workCtx.putImageData(painted, 0, 0);
      }
      const scale = props.fit === "cover"
        ? Math.max(w / sorted.width, h / sorted.height)
        : Math.min(w / sorted.width, h / sorted.height);
      const dw = sorted.width * scale;
      const dh = sorted.height * scale;
      ctx.drawImage(work, (w - dw) / 2, (h - dh) / 2, dw, dh);
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
      if (props.src !== before.src) {
        load();
      } else if (props.direction !== before.direction || props.low !== before.low || props.high !== before.high) {
        process();
      } else {
        draw();
      }
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
