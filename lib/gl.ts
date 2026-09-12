import { createCanvas } from "./canvas";
import { parseColor } from "./color";
import { watchPalette, type Colors, type Token } from "./palette";

/** WebGL2 for shader components: one fullscreen triangle, a fragment shader, and its uniforms. The core owns
 *  the frame loop and calls draw(); this module never schedules a frame. It is the only module that asks for
 *  a WebGL2 context. See docs/decisions/0006-webgl2-runtime.md. */

export type Uniform = number | readonly number[];

export interface ShaderOptions {
  /** GLSL ES 3.00 that follows the prelude. It declares any extra uniforms, defines main(), and writes
   *  pica_color, with straight (not premultiplied) alpha. The prelude declares u_resolution in device
   *  pixels, u_time in seconds (wrapping every hour), u_seed, u_pointer (0 to 1 across the host with y
   *  running up, the same way as gl_FragCoord, or -1 when outside: set it with pointerUv), the palette as
   *  u_fg, u_bg, u_accent, and u_muted (RGBA, 0 to 1), and two helpers:
   *  pica_hash(uvec2), an integer hash, and pica_random(vec2), a seeded value in [0, 1) per cell. */
  fragment: string;
  /** A CSS background shown instead when WebGL2 is unavailable or the shader cannot build. Build it from
   *  palette tokens with cssVar, so it still follows the page. */
  fallback: string;
  /** Starting values for extra uniforms, by name. Numbers set floats; arrays of 2 to 4 set vectors; longer
   *  arrays set float arrays. */
  uniforms?: Readonly<Record<string, Uniform>>;
  /** Device pixel ratio ceiling. Shaders are soft, so 1.5 looks like 2 for less work. Below 1 renders at a
   *  lower resolution that CSS scales up: 0.5 draws one pixel per two CSS pixels. */
  maxDpr?: number;
  /** Extra inline CSS for the canvas, such as image-rendering:pixelated to keep scaled-up pixels square. */
  css?: string;
  /** Called when the picture is stale without a new frame: after a resize, a palette change, or a restored
   *  context. Redraw there, usually with loop.redraw(). */
  onInvalidate: () => void;
}

export interface Shader {
  /** False when WebGL2 is unavailable or the shader failed to build. The fallback background shows then. */
  readonly ok: boolean;
  /** Sets an extra uniform for the next draw. */
  set(name: string, value: Uniform): void;
  /** Draws one frame at animation time `t`, in milliseconds. */
  draw(t: number): void;
  destroy(): void;
}

/** Three vertices from gl_VertexID that cover the viewport, so no vertex buffer is needed. */
const FULLSCREEN_VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

/** Declarations every fragment shader starts with. The hash is integer arithmetic, so it gives the same
 *  values on every GPU, unlike the usual fract(sin(x) * 43758.5). */
const SHADER_PRELUDE = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform vec2 u_pointer;
uniform vec4 u_fg;
uniform vec4 u_bg;
uniform vec4 u_accent;
uniform vec4 u_muted;
out vec4 pica_color;
uint pica_hash(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return v.x ^ v.y;
}
float pica_random(vec2 cell) {
  uvec2 c = uvec2(ivec2(floor(cell)));
  return float(pica_hash(c + uvec2(uint(u_seed) * 747796405u, uint(u_seed)))) / 4294967296.0;
}
`;

/** Animation time wraps every hour, so a float keeps its precision however long a page stays open. */
const WRAP_SECONDS = 3600;

/** A backing store past this many pixels costs more than a soft shader can show. */
const MAX_PIXELS = 2_000_000;

function toVectors(colors: Colors): Record<Token, number[]> {
  const vec = (color: string): number[] => parseColor(color).map((channel) => channel / 255);
  return { fg: vec(colors.fg), bg: vec(colors.bg), accent: vec(colors.accent), muted: vec(colors.muted) };
}

function compileStage(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  // A shader that does not build is a bug in the component, so say so; the fallback shows meanwhile.
  if (!gl.isContextLost()) console.error(`Pica shader did not compile: ${gl.getShaderInfoLog(shader) ?? ""}`);
  gl.deleteShader(shader);
  return null;
}

/** A pointer event as u_pointer wants it: 0 to 1 across the host, with y running up like gl_FragCoord, and
 *  [-1, -1] when the pointer is outside. Reading the DOM's own top-down y straight into the uniform is the
 *  mistake this exists to stop, because it mirrors every pointer effect vertically. */
export function pointerUv(host: HTMLElement, event: { clientX: number; clientY: number }): [number, number] {
  const rect = host.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return [-1, -1];
  const x = (event.clientX - rect.left) / rect.width;
  const y = 1 - (event.clientY - rect.top) / rect.height;
  return x < 0 || x > 1 || y < 0 || y > 1 ? [-1, -1] : [x, y];
}

export function createShader(host: HTMLElement, options: ShaderOptions): Shader {
  const { fragment, fallback, onInvalidate } = options;
  const values = new Map<string, Uniform>([["u_pointer", [-1, -1]], ...Object.entries(options.uniforms ?? {})]);
  const surface = createCanvas(host, {
    maxDpr: options.maxDpr ?? 1.5,
    maxPixels: MAX_PIXELS,
    css: options.css ?? "",
    onResize: () => onInvalidate(),
  });
  const canvas = surface.canvas;
  let colors: Record<Token, number[]> = { fg: [], bg: [], accent: [], muted: [] };
  const palette = watchPalette(host, (next) => {
    colors = toVectors(next);
    onInvalidate();
  });
  colors = toVectors(palette.colors);
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  let program: WebGLProgram | null = null;
  let locations = new Map<string, WebGLUniformLocation | null>();
  let lost = false;

  function build(): boolean {
    program = null;
    if (!gl || gl.isContextLost()) return false;
    const vertex = compileStage(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX);
    const pixel = compileStage(gl, gl.FRAGMENT_SHADER, SHADER_PRELUDE + fragment);
    if (!vertex || !pixel) return false;
    const linked = gl.createProgram();
    gl.attachShader(linked, vertex);
    gl.attachShader(linked, pixel);
    gl.linkProgram(linked);
    gl.deleteShader(vertex);
    gl.deleteShader(pixel);
    if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) {
      if (!gl.isContextLost()) console.error(`Pica shader did not link: ${gl.getProgramInfoLog(linked) ?? ""}`);
      gl.deleteProgram(linked);
      return false;
    }
    program = linked;
    locations = new Map();
    gl.disable(gl.DITHER);
    return true;
  }

  function upload(context: WebGL2RenderingContext, linked: WebGLProgram, name: string, value: Uniform): void {
    let location = locations.get(name);
    if (location === undefined) {
      location = context.getUniformLocation(linked, name);
      locations.set(name, location);
    }
    if (!location) return;
    if (typeof value === "number") context.uniform1f(location, value);
    else if (value.length === 2) context.uniform2f(location, value[0] ?? 0, value[1] ?? 0);
    else if (value.length === 3) context.uniform3f(location, value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
    else if (value.length === 4) context.uniform4f(location, value[0] ?? 0, value[1] ?? 0, value[2] ?? 0, value[3] ?? 0);
    else context.uniform1fv(location, new Float32Array(value));
  }

  let ok = build();
  canvas.style.background = ok ? "" : fallback;

  const onLost = (event: Event): void => {
    // Without preventDefault the browser never gives the context back.
    event.preventDefault();
    lost = true;
  };
  const onRestored = (): void => {
    lost = false;
    ok = build();
    canvas.style.background = ok ? "" : fallback;
    onInvalidate();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  return {
    get ok() {
      return ok;
    },
    set(name, value) {
      values.set(name, value);
    },
    draw(t) {
      if (!ok || lost || !gl || !program) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      upload(gl, program, "u_resolution", [canvas.width, canvas.height]);
      upload(gl, program, "u_time", (t / 1000) % WRAP_SECONDS);
      upload(gl, program, "u_fg", colors.fg);
      upload(gl, program, "u_bg", colors.bg);
      upload(gl, program, "u_accent", colors.accent);
      upload(gl, program, "u_muted", colors.muted);
      for (const [name, value] of values) upload(gl, program, name, value);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      palette.destroy();
      // Free the context now rather than at garbage collection, since browsers cap how many can be live.
      if (gl && !gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
      surface.destroy();
    },
  };
}
