import { labelHost } from "../../../lib/a11y";
import { createCanvas } from "../../../lib/canvas";
import { threshold } from "../../../lib/dither";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope, styleHost } from "../../../lib/host";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AvatarProps {
  /** The image URL or data URI. An empty value keeps the initials visible. */
  src: string;
  /** The accessible name and the source of the first two initials. */
  name: string;
  /** The square frame size in pixels, from 24 through 128. */
  size: number;
  /** Screens a loaded image into foreground ink and the exposed ground. */
  dither: boolean;
}

export const defaults: AvatarProps = {
  src: "",
  name: "Ada Lin",
  size: 48,
  dither: true,
};

function avatarSize(value: number): number {
  return Math.max(24, Math.min(128, value));
}

function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0] ?? "").join("").toUpperCase();
}

function avatarRules(selector: string, size: number): string {
  const edge = avatarSize(size);
  return [
    `${selector}{display:inline-block;position:relative;vertical-align:middle;box-sizing:border-box;overflow:hidden;border:1px solid ${cssVar("fg")};border-radius:0;background:transparent;color:${cssVar("fg")}}`,
    `${selector}>[data-pica-avatar-initials]{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:${GRID_FONT};font-size:${Math.max(10, edge * 0.34)}px;font-weight:500;line-height:1;letter-spacing:0.04em;text-align:center;white-space:nowrap;pointer-events:none}`,
  ].join("\n");
}

export const mount: Mount<AvatarProps> = (host, initial = {}) => {
  let props: AvatarProps = { ...defaults, ...initial };
  let image: HTMLImageElement | null = null;
  let loadSerial = 0;
  const attrs = hostAttributes(host);
  attrs.set("role", host.getAttribute("role"));
  attrs.set("aria-label", host.getAttribute("aria-label"));
  attrs.set("aria-hidden", host.getAttribute("aria-hidden"));
  const sheet = scope(host);
  const initials = document.createElement("span");
  initials.setAttribute("data-pica", "");
  initials.setAttribute("data-pica-avatar-initials", "");
  initials.setAttribute("aria-hidden", "true");
  host.append(initials);
  sheet.setRules(avatarRules(sheet.selector, props.size));
  let restoreSize = styleHost(host, {
    width: `${avatarSize(props.size)}px`,
    height: `${avatarSize(props.size)}px`,
  });

  function showInitials(): void {
    surface.canvas.style.visibility = "hidden";
    initials.style.visibility = "visible";
  }

  function draw(): void {
    const source = image;
    const context = surface.canvas.getContext("2d");
    if (!source || !context || surface.width < 1 || surface.height < 1) {
      showInitials();
      return;
    }
    const width = surface.width;
    const height = surface.height;
    const scale = Math.max(width / source.naturalWidth, height / source.naturalHeight);
    const drawWidth = source.naturalWidth * scale;
    const drawHeight = source.naturalHeight * scale;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;
    try {
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, width, height);
      context.drawImage(source, x, y, drawWidth, drawHeight);
      if (props.dither) {
        const pixels = context.getImageData(0, 0, width, height);
        const values = new Float32Array(width * height);
        for (let i = 0; i < values.length; i++) {
          const offset = i * 4;
          const luminance = 0.2126 * (pixels.data[offset] ?? 0) + 0.7152 * (pixels.data[offset + 1] ?? 0) + 0.0722 * (pixels.data[offset + 2] ?? 0);
          values[i] = (1 - luminance / 255) * ((pixels.data[offset + 3] ?? 0) / 255);
        }
        const bits = threshold(values, width, height, 0.47, 4);
        const mask = context.createImageData(width, height);
        for (let i = 0; i < bits.length; i++) {
          const offset = i * 4;
          mask.data[offset] = 255;
          mask.data[offset + 1] = 255;
          mask.data[offset + 2] = 255;
          mask.data[offset + 3] = (bits[i] ?? 0) * 255;
        }
        context.clearRect(0, 0, width, height);
        context.putImageData(mask, 0, 0);
        context.globalCompositeOperation = "source-in";
        context.fillStyle = palette.colors.fg;
        context.fillRect(0, 0, width, height);
        context.globalCompositeOperation = "source-over";
      }
      initials.style.visibility = "hidden";
      surface.canvas.style.visibility = "visible";
    } catch {
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, width, height);
      showInitials();
    }
  }

  const surface = createCanvas(host, {
    maxDpr: 2,
    maxPixels: 65536,
    css: "image-rendering:pixelated",
    onResize: draw,
  });
  const palette = watchPalette(host, () => {
    if (props.dither) draw();
  });

  function applyName(): void {
    labelHost(host, props.name);
    initials.textContent = avatarInitials(props.name);
  }

  function load(): void {
    const serial = ++loadSerial;
    image = null;
    showInitials();
    if (!props.src) {
      host.dataset.picaReady = "true";
      return;
    }
    const next = new Image();
    next.crossOrigin = "anonymous";
    next.decoding = "async";
    next.onload = () => {
      if (serial !== loadSerial) return;
      image = next;
      draw();
      host.dataset.picaReady = "true";
    };
    next.onerror = () => {
      if (serial === loadSerial) {
        showInitials();
        host.dataset.picaReady = "true";
      }
    };
    next.src = props.src;
  }

  applyName();
  load();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (props.name !== before.name) applyName();
      if (props.size !== before.size) {
        sheet.setRules(avatarRules(sheet.selector, props.size));
        restoreSize();
        restoreSize = styleHost(host, {
          width: `${avatarSize(props.size)}px`,
          height: `${avatarSize(props.size)}px`,
        });
      }
      if (props.src !== before.src) load();
      else if (props.dither !== before.dither) draw();
      if (palette.refresh() && props.dither) draw();
    },
    destroy() {
      loadSerial++;
      image = null;
      palette.destroy();
      surface.destroy();
      restoreSize();
      initials.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
