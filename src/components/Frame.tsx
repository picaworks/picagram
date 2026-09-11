"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { TOKENS, type CatalogItem, type PaletteProp, type Props } from "@/lib/catalog";
import { setFrameGround, type Ground } from "@/lib/ground";

/** Board units are CSS pixels at 100%. A frame is the 1280 by 800 capture, so frames are 16:10. */
export const FRAME_W = 1280;
export const FRAME_H = 800;

export type FrameWidth = 390 | 768 | 1280;
export const FRAME_WIDTHS: readonly FrameWidth[] = [390, 768, 1280];

export interface LiveState {
  ground: Ground;
  width: FrameWidth;
  defaults: Props;
  /** The props that differ from the defaults. */
  overrides: Props;
  /** Palette tokens the user set for this component. An unset token follows the page. */
  palette: PaletteProp;
}

interface FrameProps {
  item: CatalogItem;
  x: number;
  y: number;
  selected: boolean;
  /** Filtered out by the search or a tag: drawn dimmer, never removed, so the board keeps its shape. */
  dimmed: boolean;
  /** The board's ground. On paper, a frame shows the light capture when there is one. */
  ground: Ground;
  onSelect: (slug: string) => void;
  /** Set on the selected frame only. One frame is live at a time. */
  live: LiveState | null;
}

/** One frame on the board: the capture, or the live page when selected. */
export function Frame({ item, x, y, selected, dimmed, ground, onSelect, live }: FrameProps) {
  // The capture that matches the ground, then the dark capture, then the title in muted text. Paths are
  // relative to the page, so the site works under any base path.
  const sources = useMemo(
    () => (ground === "paper" ? [`thumbs/${item.slug}-light.jpg`, `thumbs/${item.slug}.jpg`] : [`thumbs/${item.slug}.jpg`]),
    [item.slug, ground],
  );
  const [failed, setFailed] = useState<readonly string[]>([]);
  const src = sources.find((candidate) => !failed.includes(candidate));
  const imgRef = useRef<HTMLImageElement>(null);
  const fail = useCallback((url: string) => setFailed((list) => (list.includes(url) ? list : [...list, url])), []);

  // An image that failed before hydration never reports the error event, so its state is read once after mount.
  useEffect(() => {
    const img = imgRef.current;
    if (src && img && img.complete && img.naturalWidth === 0) fail(src);
  }, [src, fail]);

  // A click selects through the canvas's pointer handling. Focus selects only when it arrived by keyboard,
  // so starting a drag on a frame does not load it.
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.currentTarget.matches(":focus-visible")) onSelect(item.slug);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(item.slug);
    }
  };

  return (
    <div
      className="frame"
      data-slug={item.slug}
      data-selected={selected || undefined}
      data-dimmed={dimmed || undefined}
      role={live ? "group" : "button"}
      tabIndex={0}
      aria-pressed={live ? undefined : selected}
      aria-label={live ? `${item.title}, live` : item.title}
      style={{ left: x, top: y, width: FRAME_W, height: FRAME_H }}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      <div className="frame-label" aria-hidden="true">
        <span className="frame-title">{item.title}</span>
        <span className="frame-slug">{item.slug}</span>
      </div>
      {live ? (
        <Live item={item} live={live} />
      ) : src ? (
        <img
          key={src}
          ref={imgRef}
          className="frame-thumb"
          src={src}
          alt=""
          width={FRAME_W}
          height={FRAME_H}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => fail(src)}
        />
      ) : (
        <div className="frame-missing">
          <span>{item.title}</span>
        </div>
      )}
    </div>
  );
}

function Live({ item, live }: { item: CatalogItem; live: LiveState }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const sent = useRef(new Set<string>());
  const { ground, width, defaults, overrides, palette } = live;

  const post = useCallback(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    const props: Props = { ...overrides };
    // The message carries what differs from the defaults. A prop that just went back to its default is not in
    // that set, but the frame still holds the old value, so it travels once more with its default and is then forgotten.
    for (const name of sent.current) {
      if (name in props) continue;
      const value = defaults[name];
      if (value !== undefined) props[name] = value;
      sent.current.delete(name);
    }
    for (const name of Object.keys(overrides)) sent.current.add(name);
    // The palette always carries all four tokens, an empty string for an unset one, because removing a
    // custom property the host never had is harmless, and it lets a token that was just cleared take effect.
    const paletteProps: Record<string, string> = {};
    for (const token of TOKENS) paletteProps[token] = palette[token] ?? "";
    win.postMessage({ type: "pica:props", props: { ...props, palette: paletteProps } }, "*");
  }, [overrides, defaults, palette]);

  const paint = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (doc?.body) setFrameGround(doc, ground);
  }, [ground]);

  // The ground first, then the props, so a component that reads its host's colors draws with the new ones.
  useEffect(() => {
    paint();
    post();
  }, [paint, post]);

  return (
    <div className="frame-stage" data-ground={ground}>
      <iframe
        ref={frameRef}
        className="frame-live"
        src={`v/${item.slug}.html`}
        title={`${item.title}, live`}
        style={{ width }}
        onLoad={() => {
          sent.current.clear();
          paint();
          post();
        }}
      />
    </div>
  );
}
