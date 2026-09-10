"use client";
import { CATEGORY_TITLES, type CatalogItem, type PropValue, type Props } from "@/lib/catalog";
import { formatBytes } from "@/lib/props";
import { CodeTabs } from "./CodeTabs";
import { ControlField } from "./Controls";

const RELATION = { "port-of": "port of", "inspired-by": "inspired by", technique: "technique" } as const;

interface InspectorProps {
  item: CatalogItem | null;
  /** The defaults with the overrides applied. */
  values: Props;
  /** The props that differ from the defaults. */
  overrides: Props;
  onChange: (name: string, value: PropValue) => void;
  onReset: () => void;
  activeTags: readonly string[];
  onToggleTag: (tag: string) => void;
  total: number;
}

/** The right pane: what the selected component is, its controls, its code, and who it builds on. */
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
              <a href="/llms.txt">/llms.txt</a>
              <span>The index, one line per component.</span>
            </li>
            <li>
              <a href="/llms-full.txt">/llms-full.txt</a>
              <span>Every component in one file.</span>
            </li>
          </ul>
        </div>
      </aside>
    );
  }

  const controls = Object.entries(item.controls);
  const changed = Object.keys(p.overrides).length;

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
              hint={item.docs[name]}
              onChange={(value) => p.onChange(name, value)}
            />
          ))
        )}
      </section>

      <section className="inspector-section" aria-label="Code">
        <CodeTabs key={item.slug} item={item} overrides={p.overrides} />
      </section>

      <section className="inspector-section" aria-labelledby="credits-heading">
        <h2 id="credits-heading" className="label">
          Credits
        </h2>
        {item.credits.length === 0 ? (
          <p className="inspector-note">Original to Pica.</p>
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
