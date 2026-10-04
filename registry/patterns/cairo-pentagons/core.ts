import { hostAttributes, layer } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CairoPentagonsProps {
  /** Distance between neighboring four-way junctions in CSS pixels, from 20 to 160. */
  scale: number;
  /** Orientation of the complete tiling in degrees, from -180 to 180. */
  orientation: number;
  /** Seam opacity from 0 to 1; background color remains owned by the palette. */
  opacity: number;
}

export const defaults: CairoPentagonsProps = {
  scale: 54,
  orientation: 0,
  opacity: 0.22,
};

function cairoNumber(value: number, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

/** A 2 x 2 repeat of alternating H and I struts is the exact Cairo edge graph.
 * Three-way vertices meet at 120 degrees; lattice corners meet at 90 degrees.
 * Every enclosed face has five sides: four equal long sides and one short side.
 */
function cairoMask(scale: number): string {
  const a = 1 / (2 * Math.sqrt(3));
  const paths: string[] = [];
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      if ((x + y) % 2 === 0) {
        paths.push(`M${x},${y}L${x + a},${y + 0.5}L${x},${y + 1}`);
        paths.push(`M${x + 1},${y}L${x + 1 - a},${y + 0.5}L${x + 1},${y + 1}`);
        paths.push(`M${x + a},${y + 0.5}L${x + 1 - a},${y + 0.5}`);
      } else {
        paths.push(`M${x},${y}L${x + 0.5},${y + a}L${x + 1},${y}`);
        paths.push(`M${x},${y + 1}L${x + 0.5},${y + 1 - a}L${x + 1},${y + 1}`);
        paths.push(`M${x + 0.5},${y + a}L${x + 0.5},${y + 1 - a}`);
      }
    }
  }
  // Alpha masking uses the opaque stroke, so color stays in the live CSS palette.
  // A scale-dependent stroke in unit coordinates stays one CSS pixel wide.
  const image = `<svg xmlns="http://www.w3.org/2000/svg" width="${scale * 2}" height="${scale * 2}" viewBox="0 0 2 2"><path d="${paths.join("")}" fill="none" stroke="currentColor" stroke-width="${1 / scale}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(image)}")`;
}

export const mount: Mount<CairoPentagonsProps> = (host, initial = {}) => {
  let props: CairoPentagonsProps = { ...defaults, ...initial };
  let alive = true;
  const attributes = hostAttributes(host);
  // The under layer preserves child nodes, pointer input, and host semantics.
  const surface = layer(host, "under");
  surface.el.style.overflow = "hidden";
  surface.el.style.borderRadius = "inherit";
  surface.el.style.backgroundColor = cssVar("bg");
  const seams = document.createElement("div");
  seams.setAttribute("data-pica", "");
  seams.setAttribute("aria-hidden", "true");
  seams.style.cssText = `position:absolute;left:50%;top:50%;pointer-events:none;transform-origin:center;background:${cssVar("fg")};mask-mode:alpha;mask-repeat:repeat;-webkit-mask-repeat:repeat`;
  surface.el.appendChild(seams);

  function size(): void {
    if (!alive) return;
    const scale = cairoNumber(props.scale, defaults.scale, 20, 160);
    // A square larger than the host diagonal covers every angle, including
    // extremely wide or tall hosts, without clipping the host's own children.
    const side = Math.ceil(Math.hypot(host.clientWidth, host.clientHeight) + scale * 4);
    seams.style.width = `${side}px`;
    seams.style.height = `${side}px`;
  }

  function geometry(): void {
    const scale = cairoNumber(props.scale, defaults.scale, 20, 160);
    const image = cairoMask(scale);
    seams.style.setProperty("mask-image", image);
    seams.style.setProperty("-webkit-mask-image", image);
    seams.style.setProperty("mask-size", `${scale * 2}px ${scale * 2}px`);
    seams.style.setProperty("-webkit-mask-size", `${scale * 2}px ${scale * 2}px`);
    seams.style.setProperty("mask-position", "center");
    seams.style.setProperty("-webkit-mask-position", "center");
    size();
  }

  function appearance(): void {
    const orientation = cairoNumber(props.orientation, defaults.orientation, -180, 180);
    seams.style.transform = `translate(-50%, -50%) rotate(${orientation}deg)`;
    seams.style.opacity = String(cairoNumber(props.opacity, defaults.opacity, 0, 1));
  }

  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(size) : null;
  resize?.observe(host);
  geometry();
  appearance();
  attributes.set("data-pica-ready", "true");

  return {
    update(next) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...next };
      if (before.scale !== props.scale) geometry();
      if (before.orientation !== props.orientation || before.opacity !== props.opacity) appearance();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      resize?.disconnect();
      surface.remove();
      attributes.restore();
    },
  };
};
