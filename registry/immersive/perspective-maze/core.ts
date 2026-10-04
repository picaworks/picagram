import { createCanvas } from "../../../lib/canvas";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar, watchPalette } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export type MazeDirection = "north" | "east" | "south" | "west";

export interface PerspectiveMazeProps {
  /** Grid rows: # is a wall, . or a space is a passage, E is an exit; all other and missing cells are solid. */
  grid: string[];
  /** Controlled zero-based [column, row]; null uses internal navigation. Invalid cells resolve to the nearest passage. */
  position: [number, number] | null;
  /** Initial [column, row], read once when mounted in uncontrolled mode. */
  defaultPosition: [number, number];
  /** Controlled cardinal heading; null uses internal turning. */
  direction: MazeDirection | null;
  /** Initial cardinal heading, read once when mounted in uncontrolled mode. */
  defaultDirection: MazeDirection;
  /** Accessible name for the viewport, controls, and location summary; empty hides the component. */
  label: string;
}

export interface PerspectiveMazeEvents {
  /** A collision-safe destination cell, emitted only in response to navigation input. */
  positionChange: [number, number];
  /** A proposed cardinal heading, emitted only in response to a turn. */
  directionChange: MazeDirection;
}

export const defaults: PerspectiveMazeProps = {
  grid: [
    "#########",
    "#......E#",
    "#.###.#.#",
    "#.#...#.#",
    "#.#.###.#",
    "#...#...#",
    "#########",
  ],
  position: null,
  defaultPosition: [1, 1],
  direction: null,
  defaultDirection: "east",
  label: "Perspective maze",
};

const MAZE_HEADINGS: readonly MazeDirection[] = ["north", "east", "south", "west"];
const MAZE_VECTORS: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function mazeHeading(direction: MazeDirection): MazeDirection {
  return MAZE_HEADINGS.includes(direction) ? direction : "east";
}

function mazeOpen(rows: readonly string[], x: number, y: number): boolean {
  const cell = rows[y]?.[x];
  return cell === "." || cell === " " || cell === "E";
}

function mazePosition(rows: readonly string[], raw: readonly number[]): [number, number] | null {
  const x = Math.round(Number.isFinite(raw[0]) ? (raw[0] ?? 0) : 0);
  const y = Math.round(Number.isFinite(raw[1]) ? (raw[1] ?? 0) : 0);
  if (mazeOpen(rows, x, y)) return [x, y];
  let nearest: [number, number] | null = null;
  let distance = Infinity;
  for (let row = 0; row < rows.length; row++) {
    for (let column = 0; column < (rows[row]?.length ?? 0); column++) {
      if (!mazeOpen(rows, column, row)) continue;
      const next = Math.abs(column - x) + Math.abs(row - y);
      if (next < distance) { distance = next; nearest = [column, row]; }
    }
  }
  return nearest;
}

function mazePart<K extends keyof HTMLElementTagNameMap>(tag: K, name: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", name);
  return node;
}

function mazeRules(selector: string): string {
  const part = (name: string): string => `${selector} [data-part="${name}"]`;
  const fg = cssVar("fg"), muted = cssVar("muted"), accent = cssVar("accent");
  return [
    `${selector}{display:block;color:${fg}}`,
    `${part("root")}{display:grid;grid-template-rows:minmax(0,1fr) auto auto;gap:0.55em;width:100%;height:100%;min-height:0}`,
    `${part("view")}{position:relative;overflow:hidden;min-height:0;background:${cssVar("bg")};border:1px solid color-mix(in srgb,${fg} 30%,transparent)}`,
    `${part("view")}:focus-visible{outline:2px solid ${accent};outline-offset:-3px}`,
    `${part("status")}{font-family:${GRID_FONT};font-size:0.75em;line-height:1.5;color:${muted};min-height:1.5em}`,
    `${part("controls")}{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0.35em}`,
    `${selector} button{font:inherit;font-family:${GRID_FONT};font-size:0.7em;line-height:1.35;padding:0.55em 0.3em;white-space:nowrap;color:${fg};background:${cssVar("bg")};border:1px solid color-mix(in srgb,${fg} 35%,transparent);border-radius:0;cursor:pointer}`,
    `${selector} button:hover:not(:disabled){background:color-mix(in srgb,${fg} 10%,transparent)}`,
    `${selector} button:focus-visible,${selector} summary:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} button:disabled,${selector} button[aria-disabled="true"]{color:${muted};border-style:dashed;cursor:not-allowed}`,
    `${part("fallback")}{box-sizing:border-box;margin:0;padding:0.8em;font-family:${GRID_FONT};font-size:0.85em;line-height:1.3;color:${fg};max-width:100%;max-height:100%;overflow:auto}`,
    `${part("help")}{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}`,
  ].join("\n");
}

export const mount: Mount<PerspectiveMazeProps> = (host, initial = {}) => {
  let props: PerspectiveMazeProps = { ...defaults, ...initial };
  let internalPosition = mazePosition(props.grid, props.defaultPosition);
  let internalDirection = mazeHeading(props.defaultDirection);
  let alive = true;
  let surface: ReturnType<typeof createCanvas> | null = null;
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  sheet.setRules(mazeRules(sheet.selector));
  const emit = emitter<PerspectiveMazeEvents>(host);
  const abort = new AbortController();
  const on = { signal: abort.signal };
  const root = mazePart("div", "root");
  const view = mazePart("div", "view");
  view.tabIndex = 0;
  view.setAttribute("role", "group");
  const fallback = mazePart("pre", "fallback");
  const status = mazePart("div", "status");
  status.id = nextId("maze-status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  const help = mazePart("span", "help");
  help.id = nextId("maze-help");
  help.textContent = "Arrow Up or W moves forward; Arrow Down or S moves backward; Arrow Left or A turns left; Arrow Right or D turns right. Native buttons offer the same navigation. Coordinates are zero-based. Walls and cells outside the supplied grid cannot be entered. E marks an exit.";
  const controls = mazePart("div", "controls");
  const actions = ["left", "forward", "back", "right"] as const;
  const titles = ["Turn left", "Forward", "Back", "Turn right"] as const;
  const buttons = actions.map((action, index) => {
    const button = mazePart("button", action);
    button.type = "button";
    button.textContent = titles[index] ?? action;
    button.setAttribute("data-action", action);
    controls.append(button);
    return button;
  });
  view.append(fallback);
  root.append(view, status, controls, help);
  host.append(root);
  surface = createCanvas(view, { onResize: () => draw() });
  surface.canvas.setAttribute("aria-hidden", "true");
  const ctx = surface.canvas.getContext("2d");
  fallback.hidden = Boolean(ctx);
  const palette = watchPalette(host, () => { if (alive) draw(); });

  function position(): [number, number] | null {
    return mazePosition(props.grid, props.position ?? internalPosition ?? props.defaultPosition);
  }
  function direction(): MazeDirection { return mazeHeading(props.direction ?? internalDirection); }
  function vector(): readonly [number, number] { return MAZE_VECTORS[MAZE_HEADINGS.indexOf(direction())] ?? [1, 0]; }
  function available(sign: number): boolean {
    const p = position();
    const v = vector();
    return Boolean(p && mazeOpen(props.grid, p[0] + v[0] * sign, p[1] + v[1] * sign));
  }

  function configure(): void {
    const label = props.label.trim();
    attrs.set("role", label ? "group" : null);
    attrs.set("aria-label", label || null);
    attrs.set("aria-hidden", label ? null : "true");
    attrs.set("aria-describedby", label ? `${help.id} ${status.id}` : null);
    view.setAttribute("aria-label", `${label || "Maze"} viewport`);
    view.setAttribute("aria-describedby", `${help.id} ${status.id}`);
  }

  function describe(): void {
    const p = position();
    const heading = direction();
    root.setAttribute("data-direction", heading);
    root.setAttribute("data-position", p ? p.join(",") : "");
    if (!p) {
      status.textContent = "No walkable cells in the supplied grid.";
      buttons.forEach((button) => { button.disabled = true; });
    } else {
      const v = vector();
      const left = mazeOpen(props.grid, p[0] + v[1], p[1] - v[0]);
      const right = mazeOpen(props.grid, p[0] - v[1], p[1] + v[0]);
      status.textContent = `x${p[0]} y${p[1]} · ${heading.charAt(0).toUpperCase() + heading.slice(1)} · ${props.grid[p[1]]?.[p[0]] === "E" ? "Exit reached" : `Forward ${available(1) ? "open" : "wall"}, left ${left ? "open" : "wall"}, right ${right ? "open" : "wall"}`}`;
      // Keep a blocked movement button focusable so turning never drops
      // keyboard focus. act() still enforces collision for every input.
      buttons.forEach((button) => { button.disabled = false; });
      buttons[1]?.setAttribute("aria-disabled", String(!available(1)));
      buttons[2]?.setAttribute("aria-disabled", String(!available(-1)));
    }
    if (!ctx) {
      const marker = { north: "^", east: ">", south: "v", west: "<" }[heading];
      fallback.textContent = props.grid.map((row, y) => [...row].map((cell, x) => p && p[0] === x && p[1] === y ? marker : cell).join("")).join("\n") || "No grid supplied";
    }
  }

  function draw(): void {
    if (!alive || !surface) return;
    describe();
    const p = position();
    if (ctx && surface.width > 0 && surface.height > 0) {
      const width = surface.cssWidth, height = surface.cssHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, surface.width, surface.height);
      ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.colors.bg;
      ctx.fillRect(0, 0, width, height);
      if (p) {
        const forward = vector();
        const right: readonly [number, number] = [-forward[1], forward[0]];
        const originX = p[0] + 0.5, originY = p[1] + 0.5;
        const columns = Math.max(1, Math.min(600, Math.ceil(width)));
        const slice = width / columns;
        const depths = new Float64Array(columns);
        const maxSteps = props.grid.length + Math.max(0, ...props.grid.map((row) => row.length)) + 4;
        ctx.strokeStyle = palette.colors.muted;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
        for (let depth = 1; depth <= 8; depth++) {
          const y = height / 2 + height / (depth * 2);
          if (y < height) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        }
        ctx.stroke();
        for (let column = 0; column < columns; column++) {
          const camera = 2 * (column + 0.5) / columns - 1;
          const rayX = forward[0] + right[0] * 0.66 * camera;
          const rayY = forward[1] + right[1] * 0.66 * camera;
          const deltaX = rayX === 0 ? Infinity : Math.abs(1 / rayX);
          const deltaY = rayY === 0 ? Infinity : Math.abs(1 / rayY);
          const stepX = rayX < 0 ? -1 : 1, stepY = rayY < 0 ? -1 : 1;
          let cellX = p[0], cellY = p[1];
          let sideX = (rayX < 0 ? originX - cellX : cellX + 1 - originX) * deltaX;
          let sideY = (rayY < 0 ? originY - cellY : cellY + 1 - originY) * deltaY;
          let verticalSide = false;
          for (let i = 0; i < maxSteps; i++) {
            if (sideX < sideY) { sideX += deltaX; cellX += stepX; verticalSide = true; }
            else { sideY += deltaY; cellY += stepY; verticalSide = false; }
            if (!mazeOpen(props.grid, cellX, cellY)) break;
          }
          const distance = Math.max(0.05, verticalSide ? sideX - deltaX : sideY - deltaY);
          depths[column] = distance;
          const wallHeight = height / distance;
          const top = (height - wallHeight) / 2;
          const face = verticalSide ? originY + distance * rayY : originX + distance * rayX;
          const fraction = face - Math.floor(face);
          const seam = fraction < 0.018 || fraction > 0.982;
          ctx.fillStyle = palette.colors.fg;
          ctx.globalAlpha = seam ? 0.68 : Math.min(0.6, (verticalSide ? 0.48 : 0.34) / (1 + distance * 0.09));
          ctx.fillRect(column * slice, top, slice + 0.3, wallHeight);
          ctx.globalAlpha = 0.78;
          ctx.fillRect(column * slice, top, slice + 0.3, 1);
          ctx.fillRect(column * slice, top + wallHeight - 1, slice + 0.3, 1);
        }
        // Exit plaques project from actual E cells and are occluded by the
        // same depth buffer as the supplied walls.
        ctx.strokeStyle = palette.colors.accent;
        ctx.fillStyle = palette.colors.accent;
        ctx.globalAlpha = 1;
        for (let y = 0; y < props.grid.length; y++) {
          for (let x = 0; x < (props.grid[y]?.length ?? 0); x++) {
            if (props.grid[y]?.[x] !== "E") continue;
            const relativeX = x + 0.5 - originX, relativeY = y + 0.5 - originY;
            const depth = relativeX * forward[0] + relativeY * forward[1];
            if (depth <= 0.05) continue;
            const sideways = relativeX * right[0] + relativeY * right[1];
            const center = width * (0.5 + sideways / (depth * 1.32));
            const size = Math.min(height * 0.6, height / depth * 0.38);
            const index = Math.max(0, Math.min(columns - 1, Math.floor(center / slice)));
            if (center < 0 || center > width || (depths[index] ?? Infinity) < depth - 0.05) continue;
            ctx.lineWidth = Math.max(1.5, size * 0.08);
            ctx.strokeRect(center - size * 0.35, height / 2 - size / 2, size * 0.7, size);
            ctx.beginPath();
            ctx.moveTo(center - size * 0.17, height / 2); ctx.lineTo(center + size * 0.17, height / 2);
            ctx.moveTo(center + size * 0.03, height / 2 - size * 0.12); ctx.lineTo(center + size * 0.17, height / 2); ctx.lineTo(center + size * 0.03, height / 2 + size * 0.12);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    attrs.set("data-pica-ready", "true");
  }

  function act(action: typeof actions[number]): void {
    const p = position();
    if (!p) return;
    if (action === "left" || action === "right") {
      const index = MAZE_HEADINGS.indexOf(direction());
      const next = MAZE_HEADINGS[(index + (action === "left" ? 3 : 1)) % 4] ?? "east";
      if (props.direction === null) { internalDirection = next; draw(); }
      emit("directionChange", next);
      return;
    }
    const v = vector();
    const sign = action === "forward" ? 1 : -1;
    const next: [number, number] = [p[0] + v[0] * sign, p[1] + v[1] * sign];
    if (!mazeOpen(props.grid, next[0], next[1])) return;
    if (props.position === null) { internalPosition = next; draw(); }
    emit("positionChange", next);
  }

  buttons.forEach((button, index) => button.addEventListener("click", () => { const action = actions[index]; if (action) act(action); }, on));
  const onKey = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey || !root.contains(event.target as Node)) return;
    const key = event.key.toLowerCase();
    const action = key === "arrowup" || key === "w" ? "forward" : key === "arrowdown" || key === "s" ? "back" : key === "arrowleft" || key === "a" ? "left" : key === "arrowright" || key === "d" ? "right" : null;
    if (!action) return;
    event.preventDefault();
    act(action);
  };
  root.addEventListener("keydown", onKey, on);
  configure();
  draw();

  return {
    update(partial) {
      if (!alive) return;
      const before = props;
      props = { ...props, ...partial };
      if (!sameJson(before.grid, props.grid)) internalPosition = mazePosition(props.grid, internalPosition ?? props.defaultPosition);
      if (before.label !== props.label) configure();
      palette.refresh();
      draw();
    },
    destroy() {
      if (!alive) return;
      alive = false;
      abort.abort();
      palette.destroy();
      surface?.destroy();
      root.remove();
      sheet.destroy();
      attrs.restore();
    },
  };
};
