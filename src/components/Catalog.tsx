"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matches, type CatalogItem, type PropValue, type Props } from "@/lib/catalog";
import type { Ground } from "@/lib/ground";
import { useHashSlug } from "@/lib/hash";
import { diffProps } from "@/lib/props";
import { Canvas, type Reveal } from "./Canvas";
import type { FrameWidth } from "./Frame";
import { Inspector } from "./Inspector";
import { Layers } from "./Layers";

const NONE: Props = {};

/** The catalog: layers, canvas, and inspector around one piece of state, the selected slug in the URL hash. */
export function Catalog({ items }: { items: readonly CatalogItem[] }) {
  const slugs = useMemo(() => new Set(items.map((item) => item.slug)), [items]);
  const [selected, setSelected, external] = useHashSlug(slugs);
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<readonly string[]>([]);
  /** Per slug, the props that differ from its defaults, so switching frames and back keeps the tuning. */
  const [overrides, setOverrides] = useState<Readonly<Record<string, Props>>>({});
  const [ground, setGround] = useState<Ground>("ink");
  const [frameWidth, setFrameWidth] = useState<FrameWidth>(1280);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const handled = useRef(0);

  const item = useMemo(() => items.find((i) => i.slug === selected) ?? null, [items, selected]);
  const itemOverrides = (item && overrides[item.slug]) || NONE;
  const values = useMemo(() => (item ? { ...item.defaults, ...itemOverrides } : NONE), [item, itemOverrides]);
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
        [item.slug]: diffProps(item.defaults, { ...item.defaults, ...(all[item.slug] ?? {}), [name]: value }),
      }));
    },
    [item],
  );

  const reset = useCallback(() => {
    if (!item) return;
    setOverrides((all) => {
      const next = { ...all };
      delete next[item.slug];
      return next;
    });
  }, [item]);

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
        liveOverrides={itemOverrides}
      />
      <Inspector
        item={item}
        values={values}
        overrides={itemOverrides}
        onChange={setProp}
        onReset={reset}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        total={items.length}
      />
    </main>
  );
}
