"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matches, type CatalogItem, type PaletteProp, type PropValue, type Props, type Token } from "@/lib/catalog";
import type { Ground } from "@/lib/ground";
import { useHashSlug } from "@/lib/hash";
import { diffProps } from "@/lib/props";
import { Canvas, type Reveal } from "./Canvas";
import type { FrameWidth } from "./Frame";
import { Inspector, type EventEntry } from "./Inspector";
import { Layers } from "./Layers";

const NONE: Props = {};
const NO_PALETTE: PaletteProp = {};
const MAX_EVENTS = 20;

function isEventMessage(data: unknown): data is { name: string; detail: unknown } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "pica:event" &&
    typeof (data as { name?: unknown }).name === "string"
  );
}

/** The catalog: layers, canvas, and inspector around one piece of state, the selected slug in the URL hash. */
export function Catalog({ items }: { items: readonly CatalogItem[] }) {
  const slugs = useMemo(() => new Set(items.map((item) => item.slug)), [items]);
  const [selected, setSelected, external] = useHashSlug(slugs);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<readonly string[]>([]);
  /** Per slug, the props the user changed from the demo state, so switching frames and back keeps the tuning. */
  const [overrides, setOverrides] = useState<Readonly<Record<string, Props>>>({});
  /** Per slug, the palette tokens the user set. */
  const [palettes, setPalettes] = useState<Readonly<Record<string, PaletteProp>>>({});
  /** The latest pica:event messages from the live frame, newest first. Reset when the selection changes,
   *  since they belong to whichever frame was live when they arrived. */
  const [events, setEvents] = useState<readonly EventEntry[]>([]);
  const [ground, setGround] = useState<Ground>("ink");
  const [frameWidth, setFrameWidth] = useState<FrameWidth>(1280);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const handled = useRef(0);

  const item = useMemo(() => items.find((i) => i.slug === selected) ?? null, [items, selected]);
  /** The user's own edits, tracked against the demo state so dialling a control back to the plain default
   *  still counts as a change when the demo shows something else. Sizes the changed badge and the reset button. */
  const itemOverrides = (item && overrides[item.slug]) || NONE;
  const itemPalette = (item && palettes[item.slug]) || NO_PALETTE;
  const demoProps = item?.demo?.props ?? NONE;
  /** Defaults with the demo state layered on, so a freshly selected component starts looking finished. */
  const baseline = useMemo(() => (item ? { ...item.defaults, ...demoProps } : NONE), [item, demoProps]);
  const values = useMemo(() => ({ ...baseline, ...itemOverrides }), [baseline, itemOverrides]);
  /** What differs from the plain defaults, demo state included. Sent to the live frame and copied into the
   *  code tabs, so both always match what the controls show, however that state was reached. */
  const codeOverrides = useMemo(() => (item ? diffProps(item.defaults, values) : NONE), [item, values]);
  const visible = useMemo(
    () => new Set(items.filter((i) => matches(i, query, activeTags)).map((i) => i.slug)),
    [items, query, activeTags],
  );

  // A slug that arrived through the URL is brought into view once. Selections made on the canvas stay put.
  useEffect(() => {
    if (external === handled.current) return;
    handled.current = external;
    if (selected) setReveal({ slug: selected, nonce: external });
  }, [external, selected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The events panel belongs to whichever frame is live now, so a fresh selection starts with an empty log.
  useEffect(() => {
    setEvents([]);
  }, [selected]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!isEventMessage(e.data)) return;
      const detail = (e.data.detail === undefined ? null : e.data.detail) as EventEntry["detail"];
      const entry: EventEntry = { name: e.data.name, detail, time: Date.now() };
      setEvents((list) => [entry, ...list].slice(0, MAX_EVENTS));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const selectOnCanvas = useCallback((slug: string | null) => setSelected(slug), [setSelected]);
  const selectInLayers = useCallback(
    (slug: string) => {
      setSelected(slug);
      setReveal({ slug, nonce: Date.now() });
    },
    [setSelected],
  );

  const setProp = useCallback(
    (name: string, value: PropValue) => {
      if (!item) return;
      setOverrides((all) => ({
        ...all,
        [item.slug]: diffProps(baseline, { ...baseline, ...(all[item.slug] ?? {}), [name]: value }),
      }));
    },
    [item, baseline],
  );

  const reset = useCallback(() => {
    if (!item) return;
    setOverrides((all) => {
      const next = { ...all };
      delete next[item.slug];
      return next;
    });
  }, [item]);

  const setPaletteToken = useCallback(
    (token: Token, value: string) => {
      if (!item) return;
      setPalettes((all) => ({ ...all, [item.slug]: { ...all[item.slug], [token]: value } }));
    },
    [item],
  );

  const resetPaletteToken = useCallback(
    (token: Token) => {
      if (!item) return;
      setPalettes((all) => {
        const current = { ...all[item.slug] };
        delete current[token];
        return { ...all, [item.slug]: current };
      });
    },
    [item],
  );

  const clearEvents = useCallback(() => setEvents([]), []);

  const toggleTag = useCallback(
    (tag: string) => setActiveTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])),
    [],
  );

  return (
    <main className="app">
      <Layers
        items={items}
        visible={visible}
        selected={selected}
        onSelect={selectInLayers}
        query={query}
        onQuery={setQuery}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        searchRef={searchRef}
      />
      <Canvas
        items={items}
        visible={visible}
        selected={selected}
        onSelect={selectOnCanvas}
        reveal={reveal}
        ground={ground}
        onGround={setGround}
        frameWidth={frameWidth}
        onFrameWidth={setFrameWidth}
        liveDefaults={item?.defaults ?? null}
        liveOverrides={codeOverrides}
        livePalette={itemPalette}
      />
      <Inspector
        item={item}
        values={values}
        overrides={itemOverrides}
        codeOverrides={codeOverrides}
        onChange={setProp}
        onReset={reset}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        total={items.length}
        palette={itemPalette}
        onPaletteChange={setPaletteToken}
        onPaletteReset={resetPaletteToken}
        events={events}
        onClearEvents={clearEvents}
      />
    </main>
  );
}
