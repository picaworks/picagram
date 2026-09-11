"use client";
import { CATEGORY_TITLES, type CatalogItem, type PaletteProp, type PropValue, type Props, type Token } from "@/lib/catalog";
import { formatBytes } from "@/lib/props";
import type { Json } from "../../lib/types";
import { CodeTabs } from "./CodeTabs";
import { ControlField } from "./Controls";

const RELATION = { "port-of": "port of", "inspired-by": "inspired by", technique: "technique" } as const;

/** One entry in the events panel: a pica:event message the live frame posted. */
export interface EventEntry {
  name: string;
  detail: Json;
  time: number;
}

interface InspectorProps {
  item: CatalogItem | null;
  /** The defaults with the demo state and the overrides applied: what the controls and the live frame show. */
  values: Props;
  /** The props the user changed from the demo state. Sizes the changed count and the reset button. */
  overrides: Props;
  /** The props that differ from the plain defaults, demo state included. What the code tabs copy. */
  codeOverrides: Props;
  onChange: (name: string, value: PropValue) => void;
  onReset: () => void;
  activeTags: readonly string[];
  onToggleTag: (tag: string) => void;
  total: number;
  /** Palette tokens the user set for this component. An unset token follows the page. */
  palette: PaletteProp;
  onPaletteChange: (token: Token, value: string) => void;
  onPaletteReset: (token: Token) => void;
  /** The latest pica:event messages from the live frame, newest first. */
  events: readonly EventEntry[];
  onClearEvents: () => void;
}

function hexOf(value: string | undefined): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** The right pane: what the selected component is, its controls, its palette, its code, its events, and who
 *  it builds on. */
export function Inspector(p: InspectorProps) {
  const { item } = p;
  if (!item) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <div className="inspector-empty">
          <p className="label">Nothing selected</p>
          <p>
            Select a frame on the canvas or a component under Layers. {p.total} {p.total === 1 ? "component" : "components"},
            each as one React file and one HTML file.
          </p>
          <p className="label">for agents</p>
          <ul className="tabs-links">
            <li>
              <a href="llms.txt">/llms.txt</a>
              <span>The index, one line per component.</span>
            </li>
            <li>
              <a href="llms-full.txt">/llms-full.txt</a>
              <span>Every component in one file.</span>
            </li>
          </ul>
        </div>
      </aside>
    );
  }

  const controls = Object.entries(item.controls);
  const changed = Object.keys(p.overrides).length;
  const palette = item.palette ?? ["fg"];
  const showEvents = Object.keys(item.events ?? {}).length > 0 || p.events.length > 0;

  return (
    <aside className="inspector" aria-label="Inspector">
      <header className="inspector-head">
        <p className="label">
          {CATEGORY_TITLES[item.category]} · {item.animated ? "animated" : "static"}
        </p>
        <h1 className="inspector-title">{item.title}</h1>
        <p className="inspector-desc">{item.description}</p>
        <dl className="inspector-meta">
          <dt>size</dt>
          <dd>{formatBytes(item.gzipBytes)} gzipped, runtime included</dd>
          <dt>slug</dt>
          <dd>{item.slug}</dd>
        </dl>
        {item.tags.length > 0 && (
          <div className="inspector-tags" role="group" aria-label="Tags, each filters the list">
            {item.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="chip"
                aria-pressed={p.activeTags.includes(tag)}
                onClick={() => p.onToggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </header>

      <section className="inspector-section" aria-labelledby="controls-heading">
        <div className="section-head">
          <h2 id="controls-heading" className="label">
            Controls{changed > 0 && <span className="section-note"> {changed} changed</span>}
          </h2>
          <button type="button" className="btn" onClick={p.onReset} disabled={changed === 0}>
            reset
          </button>
        </div>
        {controls.length === 0 ? (
          <p className="inspector-note">This component has no controls.</p>
        ) : (
          controls.map(([name, control]) => (
            <ControlField
              key={`${item.slug}:${name}`}
              name={name}
              control={control}
              value={p.values[name]}
              defaultValue={item.defaults[name]}
              hint={item.docs[name]}
              onChange={(value) => p.onChange(name, value)}
            />
          ))
        )}
      </section>

      <section className="inspector-section" aria-labelledby="palette-heading">
        <h2 id="palette-heading" className="label">
          Palette
        </h2>
        <div className="palette">
          {palette.map((token) => {
            const value = p.palette[token];
            const id = `palette-${token}`;
            return (
              <div key={token} className="palette-row">
                <label className="label palette-token" htmlFor={id}>
                  {token}
                </label>
                <input
                  type="color"
                  value={hexOf(value)}
                  aria-label={`${token} color`}
                  onChange={(e) => p.onPaletteChange(token, e.target.value)}
                />
                <input
                  id={id}
                  className="field"
                  type="text"
                  value={value ?? ""}
                  placeholder="page default"
                  spellCheck={false}
                  aria-label={`${token} as CSS`}
                  onChange={(e) => p.onPaletteChange(token, e.target.value)}
                />
                <button type="button" className="btn" onClick={() => p.onPaletteReset(token)} disabled={!value}>
                  reset
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {showEvents && (
        <section className="inspector-section" aria-labelledby="events-heading">
          <div className="section-head">
            <h2 id="events-heading" className="label">
              Events
            </h2>
            <button type="button" className="btn" onClick={p.onClearEvents} disabled={p.events.length === 0}>
              clear
            </button>
          </div>
          {p.events.length === 0 ? (
            <p className="inspector-note">No events yet. Interact with the live frame to see one.</p>
          ) : (
            <ul className="events-log">
              {p.events.map((event, i) => (
                <li key={i} className="events-row">
                  <span className="events-name">{event.name}</span>
                  <span className="events-detail">{JSON.stringify(event.detail)}</span>
                  <span className="events-time">{formatTime(event.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="inspector-section" aria-label="Code">
        <CodeTabs key={item.slug} item={item} overrides={p.codeOverrides} palette={p.palette} />
      </section>

      <section className="inspector-section" aria-labelledby="credits-heading">
        <h2 id="credits-heading" className="label">
          Credits
        </h2>
        {item.credits.length === 0 ? (
          <p className="inspector-note">Original to Picagram.</p>
        ) : (
          <ul className="credits">
            {item.credits.map((credit) => (
              <li key={`${credit.relation}:${credit.url}:${credit.title}`}>
                <span className="label">{RELATION[credit.relation]}</span>
                <a href={credit.url} target="_blank" rel="noreferrer">
                  {credit.title}
                </a>
                <span className="credits-by">
                  {credit.author}, {credit.license}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
