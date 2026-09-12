"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { matches, type CatalogItem, type Facet, type PaletteProp, type PropValue, type Props, type Token } from "@/lib/catalog";
import type { Ground } from "@/lib/ground";
import { useHashSlug } from "@/lib/hash";
import { diffProps } from "@/lib/props";
import { markTheme, saveTheme, THEME_GROUND, THEME_KEY, type Theme } from "@/lib/theme";
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
  const [activeFacets, setActiveFacets] = useState<readonly Facet[]>([]);
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
  /** Null until the client settles it, because the server cannot know which theme this reader gets. */
  const [theme, setTheme] = useState<Theme | null>(null);
  /** The inspector opens with the page. The choice is this visit's, not a saved one. */
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const showInspectorRef = useRef<HTMLButtonElement>(null);
  /** Set by a press on either collapse button, so focus follows the pane but a first render does not move it. */
  const moveFocus = useRef(false);
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
    () => new Set(items.filter((i) => matches(i, query, activeFacets)).map((i) => i.slug)),
    [items, query, activeFacets],
  );

  // The theme, settled before the first paint. The head script has already set the attribute; reading it here
  // tells React which button is pressed, and puts the attribute back after the development remount, which
  // clears everything on the document element that React does not render itself.
  useLayoutEffect(() => {
    const current = markTheme(THEME_KEY);
    setTheme(current);
    setGround(THEME_GROUND[current]);
  }, []);

  // Focus follows the pane: the button that just disappeared hands it to the one that took its place.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (inspectorOpen ? collapseRef : showInspectorRef).current?.focus();
  }, [inspectorOpen]);

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
      // Under 900px the canvas sits above the list, so a pick from the list brings the live frame into view.
      if (window.matchMedia("(max-width: 899px)").matches) {
        document.querySelector(".canvas")?.scrollIntoView({ block: "start" });
      }
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

  const toggleFacet = useCallback(
    (facet: Facet) =>
      setActiveFacets((list) => (list.includes(facet) ? list.filter((f) => f !== facet) : [...list, facet])),
    [],
  );

  /** A tag is free text, so it goes to the search box rather than becoming a filter of its own. */
  const searchTag = useCallback((tag: string) => setQuery(tag), []);

  /** Every press applies the theme's ground again, the one showing included, so it is the way back after the
   *  Ground control has moved on. */
  const chooseTheme = useCallback((next: Theme) => {
    saveTheme(next);
    setTheme(next);
    setGround(THEME_GROUND[next]);
  }, []);

  const toggleInspector = useCallback(() => {
    moveFocus.current = true;
    setInspectorOpen((open) => !open);
  }, []);

  return (
    <main className="app" data-inspector={inspectorOpen ? "open" : "collapsed"}>
      <Layers
        items={items}
        visible={visible}
        selected={selected}
        onSelect={selectInLayers}
        query={query}
        onQuery={setQuery}
        activeFacets={activeFacets}
        onToggleFacet={toggleFacet}
        theme={theme}
        onTheme={chooseTheme}
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
        inspectorOpen={inspectorOpen}
        onShowInspector={toggleInspector}
        showInspectorRef={showInspectorRef}
      />
      <Inspector
        item={item}
        values={values}
        overrides={itemOverrides}
        codeOverrides={codeOverrides}
        onChange={setProp}
        onReset={reset}
        activeFacets={activeFacets}
        onToggleFacet={toggleFacet}
        onSearchTag={searchTag}
        total={items.length}
        open={inspectorOpen}
        onCollapse={toggleInspector}
        collapseRef={collapseRef}
        palette={itemPalette}
        onPaletteChange={setPaletteToken}
        onPaletteReset={resetPaletteToken}
        events={events}
        onClearEvents={clearEvents}
      />
    </main>
  );
}
