import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrid } from "../lib/glyph-grid";

vi.mock("../lib/host", () => ({ styleHost: () => () => undefined }));

afterEach(() => vi.unstubAllGlobals());

describe("canvas glyph placement", () => {
  function setup(fixedCells?: boolean) {
    const marks: { text: string; x: number; right: number; color: string }[] = [];
    const context = {
      font: "", textBaseline: "", fillStyle: "",
      measureText: () => ({ width: 60 }),
      setTransform: vi.fn(), clearRect: vi.fn(),
      fillText(text: string, x: number, _y: number, maxWidth?: number) {
        // A fallback braille font advances farther than the measured Latin font.
        const natural = [...text].reduce((sum, glyph) => sum + (glyph === "⣿" ? 9 : 6), 0);
        marks.push({ text, x, right: x + Math.min(natural, maxWidth ?? natural), color: this.fillStyle });
      },
    };
    const canvas = { style: {}, setAttribute: vi.fn(), addEventListener: vi.fn(), getContext: () => context, remove: vi.fn() };
    vi.stubGlobal("document", { createElement: () => canvas, fonts: { addEventListener: vi.fn(), removeEventListener: vi.fn() } });
    vi.stubGlobal("getComputedStyle", () => ({ position: "relative", color: "currentColor" }));
    vi.stubGlobal("ResizeObserver", undefined);
    const host = { clientWidth: 24, clientHeight: 12, appendChild: vi.fn() } as unknown as HTMLElement;
    const grid = createGrid(host, {
      fontFamily: "monospace", fontSize: 10, lineHeight: 1.2, columns: 0,
      renderer: "canvas", color: "", ...(fixedCells === undefined ? {} : { fixedCells }),
    }, () => undefined);
    return { grid, marks, canvas };
  }

  it("contains wider fallback glyphs in their cells and preserves per-cell ink", () => {
    const { grid, marks, canvas } = setup(true);
    grid.write(0, 0, "⣿⣿⣿⣿");
    grid.set(2, 0, "⣿", "var(--custom-ink)");
    grid.flush();
    expect(marks.map(mark => mark.x)).toEqual([0, 6, 12, 18]);
    expect(marks.map(mark => mark.right)).toEqual([6, 12, 18, 24]);
    expect(marks[2]?.color).toBe("var(--custom-ink)");
    const count = marks.length;
    grid.flush();
    expect(marks).toHaveLength(count);
    grid.destroy();
    expect(canvas.remove).toHaveBeenCalledOnce();
  });

  it("preserves the existing row renderer when the option is omitted", () => {
    const { grid, marks } = setup();
    grid.write(0, 0, "⣿⣿⣿⣿");
    grid.flush();
    expect(marks).toEqual([{ text: "⣿⣿⣿⣿", x: 0, right: 36, color: "currentColor" }]);
    grid.destroy();
  });
});
