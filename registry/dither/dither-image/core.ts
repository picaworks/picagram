import { labelHost, unlabelHost } from "../../../lib/a11y";
import { inkColor, parseColor } from "../../../lib/color";
import { bayerMatrix, diffuse } from "../../../lib/dither";
import { createSampler } from "../../../lib/sample";
import { litSphere } from "../../../lib/subject";
import type { Mount } from "../../../lib/types";

export interface DitherImageProps {
  /** Image URL or data URI. Empty draws a built-in lit sphere, so the component renders with no network. */
  src: string;
  /** Text alternative. Empty marks the image decorative and hides it from assistive technology. */
  alt: string;
  /** How ink is placed: ordered Bayer at three matrix sizes, or error diffusion by Floyd-Steinberg or Atkinson. */
  algorithm: "bayer2" | "bayer4" | "bayer8" | "floyd-steinberg" | "atkinson";
  /** CSS pixels per dithered pixel. Higher values give a coarser, more graphic result. */
  scale: number;
  /** Contrast around mid grey. 1 leaves the image as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole image. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" inks the bright pixels; "dark-on-light" inks the dark ones. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
}

export const defaults: DitherImageProps = {
  src: "",
  alt: "",
  algorithm: "atkinson",
  scale: 3,
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
};

/** Which pixels get ink, from ink values already in linear light. Returns 1 where ink goes. */
function toBits(ink: Float32Array, cols: number, rows: number, algorithm: DitherImageProps["algorithm"]): Uint8Array {
  if (algorithm === "floyd-steinberg" || algorithm === "atkinson") return diffuse(ink, cols, rows, algorithm);
  const size = algorithm === "bayer2" ? 2 : algorithm === "bayer4" ? 4 : 8;
  const matrix = bayerMatrix(size);
  const bits = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const threshold = matrix[(y % size) * size + (x % size)] ?? 0.5;
      bits[y * cols + x] = (ink[y * cols + x] ?? 0) >= threshold ? 1 : 0;
    }
  }
  return bits;
}

export const mount: Mount<DitherImageProps> = (host, initial = {}) => {
  let props: DitherImageProps = { ...defaults, ...initial };
  let source: CanvasImageSource | null = null;
  let sourceW = 0;
  let sourceH = 0;
  let failed = false;
  let request = 0;
  let setAspect = false;
  const sampler = createSampler();
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated";
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
    const cols = Math.max(1, Math.round(host.clientWidth / props.scale));
    const rows = Math.max(1, Math.round(host.clientHeight / props.scale));
    canvas.width = cols;
    canvas.height = rows;
    if (ctx && source && !failed) {
      const ink = sampler.sample(source, sourceW, sourceH, host, {
        cols, rows, aspect: 1, n: 1, fit: props.fit, tone: props.tone, contrast: props.contrast, mirror: false,
      });
      const bits = toBits(ink, cols, rows, props.algorithm);
      const [r, g, b, a] = parseColor(inkColor(host));
      const image = ctx.createImageData(cols, rows);
      for (let i = 0; i < bits.length; i++) {
        const j = i * 4;
        const on = bits[i] === 1;
        image.data[j] = r;
        image.data[j + 1] = g;
        image.data[j + 2] = b;
        image.data[j + 3] = on ? a : 0;
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
