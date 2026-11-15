import { createCanvas } from "../../../lib/canvas";
import { hostAttributes } from "../../../lib/host";
import { createLoop } from "../../../lib/loop";
import { watchPalette } from "../../../lib/palette";
import { createPixelScene, pixelBox, pixelCone, pixelRod, type PixelFace, type PixelView } from "../../../lib/pixel-scene";
import type { Mount, MotionProps } from "../../../lib/types";

export interface SeattleRainTerraceProps extends MotionProps {
  /** Arrangement of houses, roads and public stairs. */
  layout: "stair-canyon" | "hairpin" | "corner-terraces";
  /** Distinct terrain levels, from two to four. */
  rise: number;
  /** Rain density, with zero producing a dry scene. */
  rain: number;
}
export const defaults: SeattleRainTerraceProps = {
  layout: "stair-canyon", rise: 3, rain: 0.35, paused: false, time: null, seed: 1,
};
type SeattleRoof = { x: number; y: number; z: number; turn: boolean };

export const mount: Mount<SeattleRainTerraceProps> = (host, initial = {}) => {
  let props = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  attrs.set("role", null);
  attrs.set("aria-label", null);
  attrs.set("aria-hidden", "true");
  attrs.set("data-pica-ready", host.getAttribute("data-pica-ready"));
  let faces: PixelFace[] = [];
  let roofs: SeattleRoof[] = [];
  let levels = 3;
  let view: PixelView;
  let treeX = 8.5;
  let treeY = 1.25;
  let destroyed = false;

  function house(x: number, y: number, z: number, turn = false): void {
    const local: PixelFace[] = [];
    pixelBox(local, [0, 0.4, 0], [2.25, 1.25, 1.8], { tone: 0.68, edge: true });
    // The projecting roof and two posts enclose a deep open porch.
    pixelBox(local, [0.08, 0.02, 0], [0.15, 0.3, 1.8], { tone: 0.85 });
    pixelBox(local, [2.02, 0.02, 0], [0.15, 0.3, 1.8], { tone: 0.85 });
    for (const [u, v, w, h] of [[0.88, 0.08, 0.5, 1.1], [0.25, 1.1, 0.4, 0.4], [1.65, 1.1, 0.4, 0.4]]) {
      local.push({ points: [[u!, 0.39, v!], [u! + w!, 0.39, v!], [u! + w!, 0.39, v! + h!], [u!, 0.39, v! + h!]], tone: 0.17 });
    }
    local.push(
      { points: [[-0.18, -0.16, 1.8], [1.125, -0.16, 2.65], [1.125, 1.81, 2.65], [-0.18, 1.81, 1.8]], tone: 0.92, edge: true },
      { points: [[1.125, -0.16, 2.65], [2.43, -0.16, 1.8], [2.43, 1.81, 1.8], [1.125, 1.81, 2.65]], tone: 0.56, edge: true },
      { points: [[-0.18, -0.16, 1.8], [2.43, -0.16, 1.8], [1.125, -0.16, 2.65]], tone: 0.72 },
      { points: [[-0.18, 1.81, 1.8], [2.43, 1.81, 1.8], [1.125, 1.81, 2.65]], tone: 0.72 },
    );
    for (const f of local) faces.push({ ...f, points: f.points.map(([u, v, t]) => [x + (turn ? 1.65 - v : u), y + (turn ? u : 1.65 - v), z + t] as const) });
    roofs.push({ x, y, z, turn });
  }
  function build(): void {
    faces = [];
    roofs = [];
    levels = Math.max(2, Math.min(4, Math.round(props.rise)));
    const corner = props.layout === "corner-terraces";
    const hairpin = props.layout === "hairpin";
    for (let i = 0; i < levels; i++) {
      const y = i * 2.7;
      const z = 0.7 + i * 0.9;
      const inset = corner ? i * 0.85 : hairpin ? (i % 2) * 0.6 : 0;
      const sx = corner ? 4.85 : 4.2;
      // The stair is cut into the hillside, rather than buried inside a slab.
      for (const [a, b] of [[inset, sx], [sx + 1.4, 10]] as const) {
        pixelBox(faces, [a, y, 0], [b - a, 2.7, z], { tone: 0.36, edge: true });
        faces.push({ points: [[a, y - 0.005, z - 0.13], [b, y - 0.005, z - 0.13], [b, y - 0.005, z], [a, y - 0.005, z]], tone: 0.8 });
      }
      if (hairpin) {
        pixelBox(faces, [i % 2 ? 0.7 : 6.1, y + 0.1, z + 0.01], [2.75, 2.5, 0.025], { tone: 0.15 });
        if (i < levels - 1) pixelBox(faces, [1, y + 2.2, z + 0.03], [7.9, 0.42, 0.04], { tone: 0.18 });
        house(i % 2 ? 6.4 : 0.8, y + 0.6, z);
      } else if (corner) {
        house(inset + 0.4, y + 0.4, z);
        house(6.8, y + 0.3, z, true);
      } else {
        house(0.75, y + 0.65, z);
        if (i !== 0) house(6.35, y + 0.5, z);
      }
      for (let j = 0; j < 4; j++) {
        const step = z - 0.9 + (j + 1) * 0.225;
        if (step > 0) pixelBox(faces, [sx, y + j * 0.675, 0], [1.4, 0.675, step + 0.025], { tone: 0.72, edge: true });
      }
    }
    treeX = hairpin ? 4 : 8.5;
    treeY = hairpin ? 3.6 : 1.25;
    const ground = 0.7 + Math.floor(treeY / 2.7) * 0.9;
    pixelBox(faces, [treeX - 0.14, treeY - 0.14, ground], [0.28, 0.28, 1.35], { tone: 0.65 });
    pixelCone(faces, [treeX, treeY, ground + 0.8], 1.22, 1.85, { ink: "accent", tone: 0.8 }, 8);
    pixelCone(faces, [treeX, treeY, ground + 1.5], 0.92, 1.5, { ink: "accent", tone: 0.88 }, 8);
    pixelBox(faces, [0.35, 0.12, 0.715], [2.1, 0.32, 0.025], { tone: 0.14, edge: true });
    view = { bounds: [[-0.3, -0.3, 0], [10.4, levels * 2.7 + 0.3, levels * 0.9 + 4]], ground: 0, yaw: 45, elevation: 30 };
  }
  function floorAt(x: number, y: number): number {
    const level = Math.max(0, Math.min(levels - 1, Math.floor(y / 2.7)));
    const terrace = 0.7 + level * 0.9;
    const stairX = props.layout === "corner-terraces" ? 4.85 : 4.2;
    const inset = props.layout === "corner-terraces" ? level * 0.85 : props.layout === "hairpin" ? (level % 2) * 0.6 : 0;
    let z = x < inset ? 0 : terrace;
    if (x >= stairX && x <= stairX + 1.4) {
      const step = Math.min(3, Math.floor((y - level * 2.7) / 0.675));
      z = Math.max(0, terrace - 0.9 + (step + 1) * 0.225 + 0.025);
    }
    for (const r of roofs) {
      const u = r.turn ? y - r.y : x - r.x;
      const v = r.turn ? x - r.x : y - r.y;
      if (u >= -0.18 && u <= 2.43 && v >= -0.16 && v <= 1.81) z = Math.max(z, r.z + 1.8 + 0.85 * Math.max(0, 1 - Math.abs(u - 1.125) / 1.305));
    }
    const distance = Math.hypot(x - treeX, y - treeY);
    const base = 0.7 + Math.floor(treeY / 2.7) * 0.9;
    if (distance < 1.22) z = Math.max(z, base + 0.8 + 1.85 * (1 - distance / 1.22));
    if (distance < 0.92) z = Math.max(z, base + 1.5 + 1.5 * (1 - distance / 0.92));
    return z;
  }
  const surface = createCanvas(host, { autoSize: false, css: "image-rendering:pixelated", onResize: () => { resize(); loop.redraw(); } });
  const scene = createPixelScene(surface.canvas);
  const palette = watchPalette(host, () => loop.redraw());
  function resize(): void {
    const scale = Math.max(3, Math.ceil(surface.cssWidth / 360), Math.ceil(surface.cssHeight / 300));
    const canvas = surface.canvas;
    canvas.width = Math.max(1, Math.floor(surface.cssWidth / scale));
    canvas.height = Math.max(1, Math.floor(surface.cssHeight / scale));
    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
    canvas.style.inset = "auto";
    canvas.style.left = `${Math.floor((surface.cssWidth - canvas.width * scale) / 2)}px`;
    canvas.style.top = `${Math.floor((surface.cssHeight - canvas.height * scale) / 2)}px`;
  }
  build();
  resize();
  function draw(t: number): void {
    const moving: PixelFace[] = [];
    const count = Math.round(Math.max(0, Math.min(1, props.rain)) * 12);
    for (let i = 0; i < count; i++) {
      const x = 0.4 + ((i * 3.71 + props.seed * 0.73) % 9.1);
      const y = 0.25 + ((i * 5.13 + props.seed * 0.31) % (levels * 2.7 - 0.5));
      const floor = floorAt(x, y) + 0.04;
      const top = levels * 0.9 + 3.8;
      const tip = top - (((t / 1150 + i * 0.319 + props.seed * 0.017) % 1 + 1) % 1) * (top - floor + 1.5);
      const end = Math.min(top, tip + 1.5);
      if (end > floor) pixelRod(moving, [x, y, Math.max(floor, tip)], [x, y, end], 0.045, { tone: 0.66 }, 4);
    }
    scene.draw(faces, moving, palette.colors, view);
    attrs.set("data-pica-ready", "true");
  }
  const loop = createLoop({ el: host, fps: 12, paused: props.paused, time: props.time, still: 1200, frame: draw });
  return {
    update(next) {
      const previous = props;
      props = { ...props, ...next };
      if (props.layout !== previous.layout || props.rise !== previous.rise) build();
      palette.refresh();
      loop.update({ paused: props.paused, time: props.time });
      loop.redraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      loop.destroy();
      palette.destroy();
      surface.destroy();
      attrs.restore();
    },
  };
};
