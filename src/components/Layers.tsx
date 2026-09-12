"use client";
import { useState, type RefObject } from "react";
import { FACETS, facetCounts, groupByCategory, type CatalogItem, type Category, type Facet } from "@/lib/catalog";
import { useMetaKey } from "@/lib/platform";
import { THEMES, type Theme } from "@/lib/theme";
import { Logo } from "./Logo";

interface LayersProps {
  items: readonly CatalogItem[];
  /** Slugs that survive the search box and the facet chips. */
  visible: ReadonlySet<string>;
  selected: string | null;
  onSelect: (slug: string) => void;
  query: string;
  onQuery: (query: string) => void;
  activeFacets: readonly Facet[];
  onToggleFacet: (facet: Facet) => void;
  /** Null until the client knows which theme is in force. Until then the head script's attribute paints the
   *  pressed button, so the control looks right before hydration. */
  theme: Theme | null;
  onTheme: (theme: Theme) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

/** The left pane: the wordmark and the theme, search, the facet filter, and the component list by category. */
export function Layers(p: LayersProps) {
  const [collapsed, setCollapsed] = useState<readonly Category[]>([]);
  const meta = useMetaKey();
  const groups = groupByCategory(p.items.filter((item) => p.visible.has(item.slug)));
  const counts = facetCounts(p.items);

  const toggle = (category: Category) =>
    setCollapsed((list) => (list.includes(category) ? list.filter((c) => c !== category) : [...list, category]));

  return (
    <aside className="layers" aria-label="Layers">
      <div className="layers-brand">
        <Logo />
        <div className="layers-brand-row">
          <span className="label">
            {p.visible.size} of {p.items.length}
          </span>
          <div className="seg" role="group" aria-label="Theme">
            {THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                className="seg-item"
                data-theme={theme}
                aria-pressed={p.theme === theme}
                onClick={() => p.onTheme(theme)}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="layers-search">
        <input
          ref={p.searchRef}
          className="field"
          type="text"
          role="searchbox"
          placeholder="Search"
          aria-label="Search components"
          autoComplete="off"
          spellCheck={false}
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              p.onQuery("");
              e.currentTarget.blur();
            }
          }}
        />
        <kbd aria-hidden="true">{meta} K</kbd>
      </div>
      <div className="layers-facets" role="group" aria-label="Filter by facet">
        {FACETS.map((facet) => (
          <button
            key={facet}
            type="button"
            className="chip"
            aria-pressed={p.activeFacets.includes(facet)}
            onClick={() => p.onToggleFacet(facet)}
          >
            {facet} <span className="chip-count">{counts[facet]}</span>
          </button>
        ))}
      </div>
      <nav className="layers-list" aria-label="Components">
        {groups.map((group) => {
          const open = !collapsed.includes(group.category);
          return (
            <section key={group.category} className="layers-group">
              <button
                type="button"
                className="layers-head"
                aria-expanded={open}
                onClick={() => toggle(group.category)}
              >
                <span className="layers-twist" aria-hidden="true">
                  {open ? "−" : "+"}
                </span>
                <span className="label">{group.title}</span>
                <span className="layers-count">{group.items.length}</span>
              </button>
              {open && (
                <ul>
                  {group.items.map((item) => {
                    const current = item.slug === p.selected;
                    return (
                      <li key={item.slug}>
                        <button
                          type="button"
                          className="layers-row"
                          aria-current={current ? "true" : undefined}
                          onClick={() => p.onSelect(item.slug)}
                        >
                          <span className="layers-marker" aria-hidden="true" />
                          <span className="layers-title">{item.title}</span>
                          {item.animated && <span className="layers-note">anim</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
        {p.visible.size === 0 && <p className="layers-empty">No component matches. Clear the search or a facet.</p>}
      </nav>
    </aside>
  );
}
