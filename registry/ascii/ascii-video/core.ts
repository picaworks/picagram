import { labelHost, unlabelHost } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { createGrid, type GridOptions } from "../../../lib/glyph-grid";
import { createLoop, type Loop } from "../../../lib/loop";
import { FALLBACK_RAMP, measureRamp, pick } from "../../../lib/ramp";
import { createSampler } from "../../../lib/sample";
import { fitHostAspect, showNote } from "../../../lib/source";
import { litSphere } from "../../../lib/subject";
import type { Mount, MotionProps } from "../../../lib/types";

export interface AsciiVideoProps extends MotionProps {
  /** Video URL. Ignored while webcam is true. Empty draws a built-in subject, so the component can render with no network. */
  src: string;
  /** Draw the camera instead of src. Requests permission only while this is true, and stops the camera as soon as it turns false. */
  webcam: boolean;
  /** Flip the picture left to right, as a mirror does. Only visible while webcam is true. */
  mirror: boolean;
  /** Text alternative. Empty marks the video decorative and hides it from assistive technology. */
  alt: string;
  /** Columns across the host. Rows follow from the host's height, or from the source's proportions when the host has none. */
  columns: number;
  /** Glyphs to draw with, in any order: they are sorted by the ink each one puts down in the font. */
  glyphs: string;
  /** Contrast around mid grey. 1 leaves the frame as it is. */
  contrast: number;
  /** "cover" fills the host and crops; "contain" fits the whole frame. */
  fit: "cover" | "contain";
  /** "auto" reads the host's colors. "light-on-dark" maps bright pixels to dense glyphs; "dark-on-light" does the reverse. */
  tone: "auto" | "light-on-dark" | "dark-on-light";
  /** CSS font-family stack for the glyphs. Must be monospace. */
  fontFamily: string;
  /** Line height as a multiple of the glyph size. */
  lineHeight: number;
  /** Frames drawn per second, at most 30. */
  fps: number;
}

export const defaults: AsciiVideoProps = {
  src: "",
  webcam: false,
  mirror: true,
  alt: "",
  columns: 96,
  glyphs: FALLBACK_RAMP,
  contrast: 1.1,
  fit: "cover",
  tone: "auto",
  fontFamily: GRID_FONT,
  lineHeight: 1.2,
  fps: 24,
  paused: false,
  time: null,
  seed: 1,
};

type SourceMode = "webcam" | "src" | "subject";

/** Milliseconds for one full sweep of the light around the built-in subject. */
const SWEEP_MS = 16000;

/** The built-in subject when there is no src and webcam is false: a sphere whose light sweeps slowly,
 *  drawn fresh each frame as a pure function of time so the same time always gives the same picture. */
function subjectFrame(t: number): HTMLCanvasElement {
  const a = (t / SWEEP_MS) * Math.PI * 2;
  return litSphere(256, 0.5 + 0.24 * Math.cos(a), 0.5 + 0.2 * Math.sin(a * 0.6));
}

export const mount: Mount<AsciiVideoProps> = (host, initial = {}) => {
  let props: AsciiVideoProps = { ...defaults, ...initial };
  let videoEl: HTMLVideoElement | null = null;
  let stream: MediaStream | null = null;
  let failed = false;
  let aspectSet = false;
  let undoAspect = (): void => undefined;
  let noteText: string | null = null;
  let removeNote: (() => void) | null = null;
  let request = 0;
  let loop: Loop | null = null;
  const sampler = createSampler();

  function gridOptions(p: AsciiVideoProps): GridOptions {
    return { fontFamily: p.fontFamily, fontSize: 12, columns: p.columns, lineHeight: p.lineHeight, renderer: "auto", color: "" };
  }

  const grid = createGrid(host, gridOptions(props), () => loop?.redraw());

  function mode(p: AsciiVideoProps): SourceMode {
    if (p.webcam) return "webcam";
    if (p.src) return "src";
    return "subject";
  }

  function setAspect(w: number, h: number): void {
    if (aspectSet || host.clientHeight >= 2 || w <= 0 || h <= 0) return;
    undoAspect = fitHostAspect(host, w, h);
    aspectSet = true;
  }

  /** Shows or removes the "unavailable" note, only touching the DOM when the text actually changes,
   *  since paint() calls this every frame. */
  function setNote(text: string | null): void {
    if (text === noteText) return;
    if (removeNote) {
      removeNote();
      removeNote = null;
    }
    if (text) removeNote = showNote(host, text);
    noteText = text;
  }

  // Created lazily, so nothing is requested until src or webcam actually asks for it.
  function ensureVideo(): HTMLVideoElement {
    if (videoEl) return videoEl;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
    v.setAttribute("aria-hidden", "true");
    v.addEventListener("loadedmetadata", () => {
      setAspect(v.videoWidth, v.videoHeight);
      loop?.redraw();
    });
    v.addEventListener("seeked", () => loop?.redraw());
    v.addEventListener("error", () => {
      failed = true;
      loop?.redraw();
    });
    host.appendChild(v);
    videoEl = v;
    return v;
  }

  function teardown(): void {
    request++;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
    if (videoEl) {
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.srcObject = null;
      videoEl.load();
    }
    failed = false;
  }

  function setup(): void {
    const m = mode(props);
    if (m === "webcam") {
      const mine = ++request;
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((s) => {
          if (mine !== request) {
            for (const track of s.getTracks()) track.stop();
            return;
          }
          stream = s;
          ensureVideo().srcObject = s;
        })
        .catch(() => {
          if (mine !== request) return;
          failed = true;
          loop?.redraw();
        });
    } else if (m === "src") {
      ensureVideo().src = props.src;
    }
  }

  // Keeps a real video element's play state and position in step with paused and time.
  function syncVideo(m: SourceMode, t: number): void {
    if (!videoEl) return;
    if (m === "webcam") {
      if (props.paused) {
        if (!videoEl.paused) videoEl.pause();
      } else if (videoEl.paused) {
        videoEl.play().catch(() => undefined);
      }
      return;
    }
    const live = !props.paused && props.time === null;
    if (live) {
      if (videoEl.paused) videoEl.play().catch(() => undefined);
      return;
    }
    if (!videoEl.paused) videoEl.pause();
    const duration = videoEl.duration;
    const target = Math.max(0, Number.isFinite(duration) ? Math.min(t / 1000, duration) : t / 1000);
    if (Math.abs(videoEl.currentTime - target) > 0.02) videoEl.currentTime = target;
  }

  function paint(t: number): void {
    grid.clear();
    const { cols, rows, aspect } = grid;
    const m = mode(props);
    let source: CanvasImageSource | null = null;
    let sw = 0;
    let sh = 0;
    if (m === "subject") {
      source = subjectFrame(t);
      sw = 256;
      sh = 256;
      setAspect(sw, sh);
    } else {
      syncVideo(m, t);
      if (videoEl && videoEl.videoWidth > 0) {
        source = videoEl;
        sw = videoEl.videoWidth;
        sh = videoEl.videoHeight;
      }
    }
    if (source) {
      setNote(null);
      const ink = sampler.sample(source, sw, sh, host, {
        cols, rows, aspect, n: 1, fit: props.fit, tone: props.tone, contrast: props.contrast, mirror: m === "webcam" && props.mirror,
      });
      const ramp = measureRamp(props.glyphs, props.fontFamily, props.lineHeight);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) grid.set(x, y, pick(ramp, ink[y * cols + x] ?? 0));
      }
    } else if (failed) {
      setNote(m === "webcam" ? "camera unavailable" : "video unavailable");
    } else {
      setNote(null);
    }
    grid.flush();
    if (source || failed) host.dataset.picaReady = "true";
  }

  labelHost(host, props.alt);
  loop = createLoop({ el: host, fps: props.fps, paused: props.paused, time: props.time, still: 1200, frame: paint });
  setup();

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      labelHost(host, props.alt);
      if (mode(props) !== mode(before) || (mode(props) === "src" && props.src !== before.src)) {
        teardown();
        setup();
      }
      if (props.columns !== before.columns || props.fontFamily !== before.fontFamily || props.lineHeight !== before.lineHeight) {
        grid.update(gridOptions(props));
      }
      loop?.update({ paused: props.paused, time: props.time, fps: props.fps });
    },
    destroy() {
      loop?.destroy();
      teardown();
      videoEl?.remove();
      videoEl = null;
      setNote(null);
      grid.destroy();
      unlabelHost(host);
      undoAspect();
      delete host.dataset.picaReady;
    },
  };
};
