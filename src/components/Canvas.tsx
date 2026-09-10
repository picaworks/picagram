"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { groupByCategory, type CatalogItem, type PaletteProp, type Props } from "@/lib/catalog";
import { GROUNDS, type Ground } from "@/lib/ground";
import { useMetaKey } from "@/lib/platform";
import { FRAME_H, FRAME_W, FRAME_WIDTHS, Frame, type FrameWidth } from "./Frame";

/** Board units are CSS pixels at 100% (see Frame). */
const GAP = 240;
/** Room above a category's first row for its label and the frame labels, which keep their screen size. */
const SECTION = 400;
/** Screen pixels kept around the board, or a frame, when fitting. */
const PAD = 48;
const MIN_K = 0.02;
const MAX_K = 4;
/** Frame labels come off when frames get this small on screen, because they would overlap the row above.
 *  Section labels stay down to the scale where the section band still holds one line of text. */
const LABELS_MIN_PX = 128;
const SECTIONS_MIN_K = 0.05;

interface View {
  x: number;
  y: number;
  k: number;
}
interface Point {
  x: number;
  y: number;
}
interface Placed {
  item: CatalogItem;
  x: number;
  y: number;
}
interface Section {
  title: string;
  count: number;
  y: number;
}
interface Board {
  frames: Placed[];
  sections: Section[];
  width: number;
  height: number;
}
interface Drag {
  id: number;
  start: Point;
  origin: Point;
  moved: boolean;
  slug: string | null;
}
interface Pinch {
  dist: number;
  mid: Point;
  view: View;
}

/** A request to bring one frame into view, from the layer list or the URL. */
export interface Reveal {
  slug: string;
  nonce: number;
}

const clamp = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));

/** One band per non-empty category, frames in rows. Sized for 12 to 60 components. */
function layoutBoard(items: readonly CatalogItem[]): Board {
  const cols = Math.max(1, Math.min(8, Math.ceil(Math.sqrt(items.length))));
  const frames: Placed[] = [];
  const sections: Section[] = [];
  let y = 0;
  let width = 0;
  for (const group of groupByCategory(items)) {
    y += SECTION;
    sections.push({ title: group.title, count: group.items.length, y });
    group.items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      frames.push({ item, x: col * (FRAME_W + GAP), y: y + row * (FRAME_H + GAP) });
      width = Math.max(width, (col + 1) * (FRAME_W + GAP) - GAP);
    });
    y += Math.ceil(group.items.length / cols) * (FRAME_H + GAP);
  }
  return { frames, sections, width, height: Math.max(0, y - GAP) };
}

interface CanvasProps {
  items: readonly CatalogItem[];
  visible: ReadonlySet<string>;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  reveal: Reveal | null;
  ground: Ground;
  onGround: (ground: Ground) => void;
  frameWidth: FrameWidth;
  onFrameWidth: (width: FrameWidth) => void;
  liveDefaults: Props | null;
  liveOverrides: Props;
  livePalette: PaletteProp;
}

/** The center pane: a board of frames on a surface that pans and zooms. */
export function Canvas(p: CanvasProps) {
  const board = useMemo(() => layoutBoard(p.items), [p.items]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 0.5 });
  const viewRef = useRef(view);
  viewRef.current = view;
  /** The page's one gesture: a button or a reveal eases to its zoom. Wheel, drag, and pinch never do. */
  const [eased, setEased] = useState(false);
  const [dragging, setDragging] = useState(false);
  /** While Cmd, Ctrl, or Space is held, the live iframe stops taking pointer events, so wheel and drag reach the board. */
  const [passthrough, setPassthrough] = useState(false);
  const touched = useRef(false);
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<Pinch | null>(null);
  const meta = useMetaKey();

  const size = useCallback(() => {
    const el = viewportRef.current;
    return { w: el?.clientWidth ?? 0, h: el?.clientHeight ?? 0 };
  }, []);

  const fitAll = useCallback(
    (ease: boolean) => {
      const { w, h } = size();
      if (!w || !h || !board.width || !board.height) return;
      const k = clamp(Math.min((w - 2 * PAD) / board.width, (h - 2 * PAD) / board.height));
      setEased(ease);
      setView({ k, x: (w - board.width * k) / 2, y: (h - board.height * k) / 2 });
    },
    [board, size],
  );

  const zoomTo = useCallback(
    (next: number) => {
      const { w, h } = size();
      const k = clamp(next);
      touched.current = true;
      setEased(true);
      setView((v) => ({ k, x: w / 2 - (w / 2 - v.x) * (k / v.k), y: h / 2 - (h / 2 - v.y) * (k / v.k) }));
    },
    [size],
  );

  const revealFrame = useCallback(
    (slug: string) => {
      const frame = board.frames.find((f) => f.item.slug === slug);
      const { w, h } = size();
      if (!frame || !w || !h) return;
      const k = clamp(Math.min(1, (w - 2 * PAD) / FRAME_W, (h - 2 * PAD) / (FRAME_H + 48)));
      touched.current = true;
      setEased(true);
      setView({ k, x: w / 2 - (frame.x + FRAME_W / 2) * k, y: h / 2 - (frame.y + FRAME_H / 2) * k });
    },
    [board, size],
  );

  useLayoutEffect(() => {
    fitAll(false);
  }, [fitAll]);

  useEffect(() => {
    if (p.reveal) revealFrame(p.reveal.slug);
  }, [p.reveal, revealFrame]);

  useEffect(() => {
    const onResize = () => {
      if (!touched.current) fitAll(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitAll]);

  useEffect(() => {
    const held = new Set<string>();
    const isEditing = (e: KeyboardEvent) =>
      e.target instanceof HTMLElement && (e.target.matches("input, select, textarea") || e.target.isContentEditable);
    const update = () => setPassthrough(held.size > 0);
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "Control" || (e.key === " " && !isEditing(e))) {
        held.add(e.key);
        update();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      held.delete(e.key);
      update();
    };
    const release = () => {
      held.clear();
      update();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", release);
    };
  }, []);

  // Wheel needs a listener that can call preventDefault, which React's passive delegation cannot promise.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      touched.current = true;
      setEased(false);
      if (e.ctrlKey || e.metaKey) {
        // A trackpad pinch arrives as a wheel with ctrlKey set and small deltas; a mouse notch is about 100.
        const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        const factor = Math.exp(-Math.max(-50, Math.min(50, delta)) * 0.005);
        setView((v) => {
          const k = clamp(v.k * factor);
          return { k, x: px - (px - v.x) * (k / v.k), y: py - (py - v.y) * (k / v.k) };
        });
      } else {
        const scale = e.deltaMode === 1 ? 16 : 1;
        setView((v) => ({ ...v, x: v.x - e.deltaX * scale, y: v.y - e.deltaY * scale }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) {
        const rect = el.getBoundingClientRect();
        pinch.current = {
          dist: Math.hypot(b.x - a.x, b.y - a.y),
          mid: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top },
          view: viewRef.current,
        };
      }
      drag.current = null;
      return;
    }
    const target = e.target as Element;
    drag.current = {
      id: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      origin: { x: viewRef.current.x, y: viewRef.current.y },
      moved: false,
      slug: target.closest("[data-slug]")?.getAttribute("data-slug") ?? null,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = e.currentTarget.getBoundingClientRect();
    const active = pinch.current;
    if (active && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      const k = clamp(active.view.k * (dist / (active.dist || 1)));
      // The board point that was under the midpoint stays under it.
      const bx = (active.mid.x - active.view.x) / active.view.k;
      const by = (active.mid.y - active.view.y) / active.view.k;
      touched.current = true;
      setEased(false);
      setView({ k, x: mid.x - bx * k, y: mid.y - by * k });
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.start.x;
    const dy = e.clientY - d.start.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      touched.current = true;
      setDragging(true);
      setEased(false);
    }
    setView((v) => ({ ...v, x: d.origin.x + dx, y: d.origin.y + dy }));
  };

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      // A press that never moved is a click: on a frame it selects, on the board it clears the selection.
      if (!d.moved && e.type === "pointerup") p.onSelect(d.slug);
      drag.current = null;
      setDragging(false);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Already released.
    }
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") p.onSelect(null);
    else if (e.shiftKey && e.code === "Digit1") fitAll(true);
    else if (e.shiftKey && e.code === "Digit0") zoomTo(1);
    else if (e.shiftKey && e.code === "Digit2" && p.selected) revealFrame(p.selected);
    else if (e.code === "Equal" || e.code === "NumpadAdd") zoomTo(viewRef.current.k * 1.25);
    else if (e.code === "Minus" || e.code === "NumpadSubtract") zoomTo(viewRef.current.k / 1.25);
    else return;
    e.preventDefault();
  };

  const labels = FRAME_W * view.k >= LABELS_MIN_PX ? "all" : view.k >= SECTIONS_MIN_K ? "sections" : "none";
  /** A section label's baseline, in board units: 48 screen pixels above its first row, but never above its band. */
  const sectionBottom = (y: number) => Math.max(y - SECTION + 16 / view.k, y - 48 / view.k);
  const surfaceStyle = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
    "--k": String(1 / view.k),
  } as CSSProperties;

  return (
    <section className="canvas" aria-label="Canvas">
      <div className="canvas-bar">
        <div className="canvas-zoom" role="group" aria-label="Zoom">
          <button type="button" className="btn" onClick={() => zoomTo(0.5)}>
            50%
          </button>
          <button type="button" className="btn" onClick={() => zoomTo(1)}>
            100%
          </button>
          <button type="button" className="btn" onClick={() => fitAll(true)}>
            fit
          </button>
          <output className="canvas-readout label" aria-label="Zoom level">
            {Math.round(view.k * 100)}%
          </output>
        </div>
        <p className="canvas-hint label">drag pans, {meta} wheel zooms</p>
        <div className="canvas-live">
          <div className="seg" role="group" aria-label="Ground">
            {GROUNDS.map((g) => (
              <button
                key={g}
                type="button"
                className="seg-item"
                aria-pressed={p.ground === g}
                onClick={() => p.onGround(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Frame width">
            {FRAME_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                className="seg-item"
                aria-pressed={p.frameWidth === w}
                onClick={() => p.onFrameWidth(w)}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="canvas-viewport"
        data-dragging={dragging || undefined}
        data-passthrough={passthrough || undefined}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={onKeyDown}
      >
        <div className="canvas-surface" data-eased={eased || undefined} data-labels={labels} style={surfaceStyle}>
          {board.sections.map((s) => (
            <div key={s.title} className="canvas-section label" style={{ top: sectionBottom(s.y) }} aria-hidden="true">
              {s.title} <span>{s.count}</span>
            </div>
          ))}
          {board.frames.map(({ item, x, y }) => {
            const selected = item.slug === p.selected;
            return (
              <Frame
                key={item.slug}
                item={item}
                x={x}
                y={y}
                selected={selected}
                dimmed={!p.visible.has(item.slug)}
                ground={p.ground}
                onSelect={p.onSelect}
                live={
                  selected && p.liveDefaults
                    ? {
                        ground: p.ground,
                        width: p.frameWidth,
                        defaults: p.liveDefaults,
                        overrides: p.liveOverrides,
                        palette: p.livePalette,
                      }
                    : null
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
