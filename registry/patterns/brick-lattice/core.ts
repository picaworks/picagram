import { layer, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface BrickLatticeProps {
  /** Course bond, either half pitch offset or vertically aligned. */
  bond: "running" | "stack";
  /** Width of each brick, in pixels. */
  width: number;
  /** Height of each masonry course, in pixels. */
  course: number;
  /** Ground left between adjacent bricks, in pixels. */
  mortar: number;
  /** Opacity of the lattice, from quiet to fully visible. */
  strength: number;
}

export const defaults: BrickLatticeProps = {
  bond: "running",
  width: 48,
  course: 16,
  mortar: 3,
  strength: 0.35,
};

export const mount: Mount<BrickLatticeProps> = (host, initial = {}) => {
  let props: BrickLatticeProps = { ...defaults, ...initial };
  const lattice = layer(host, "under");
  const sheet = scope(host);

  function draw(): void {
    sheet.setRules(brickLatticeRules(sheet.selector, props));
    host.dataset.picaReady = "true";
  }

  draw();

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      sheet.destroy();
      lattice.remove();
      delete host.dataset.picaReady;
    },
  };
};

function brickLatticeRules(selector: string, p: BrickLatticeProps): string {
  const pitch = p.width + p.mortar;
  const rise = p.course + p.mortar;
  const tileWidth = pitch * 2;
  const tileHeight = rise * 2;
  const tile = brickLatticeSvg(p, pitch, rise, tileWidth, tileHeight);
  return `${selector} > div[data-pica]{opacity:${p.strength};background-color:${cssVar("fg")};mask-image:url("${tile}");mask-size:${tileWidth}px ${tileHeight}px;mask-repeat:repeat;mask-mode:alpha}`;
}

function brickLatticeSvg(
  p: BrickLatticeProps,
  pitch: number,
  rise: number,
  tileWidth: number,
  tileHeight: number,
): string {
  const offset = p.bond === "running" ? pitch / 2 : 0;
  const rows = [0, 1]
    .map((row) => {
      const shift = row === 1 ? offset : 0;
      const start = shift ? -shift : 0;
      const count = shift ? 3 : 2;
      return Array.from({ length: count }, (_, index) => {
        const x = start + index * pitch + 0.5;
        const y = row * rise + 0.5;
        return `<rect x="${x}" y="${y}" width="${p.width - 1}" height="${p.course - 1}"/>`;
      }).join("");
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}" viewBox="0 0 ${tileWidth} ${tileHeight}" fill="none" stroke="currentColor" stroke-width="1">${rows}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
