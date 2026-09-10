"use client";
import { useState, type RefObject } from "react";
import { allTags, groupByCategory, type CatalogItem, type Category } from "@/lib/catalog";
import { useMetaKey } from "@/lib/platform";

interface LayersProps {
  items: readonly CatalogItem[];
  /** Slugs that survive the search box and the tag chips. */
  visible: ReadonlySet<string>;
  selected: string | null;
  onSelect: (slug: string) => void;
  query: string;
  onQuery: (query: string) => void;
  activeTags: readonly string[];
  onToggleTag: (tag: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

/** The left pane: search, tag chips, and the component list grouped by category. */
export function Layers(p: LayersProps) {
  const [collapsed, setCollapsed] = useState<readonly Category[]>([]);
  const meta = useMetaKey();
  const groups = groupByCategory(p.items.filter((item) => p.visible.has(item.slug)));
  const tags = allTags(p.items);

  const toggle = (category: Category) =>
    setCollapsed((list) => (list.includes(category) ? list.filter((c) => c !== category) : [...list, category]));

  return (
    <aside className="layers" aria-label="Layers">
      <div className="layers-brand">
        <strong>Pica</strong>
        <span className="label">
          {p.visible.size} of {p.items.length}
        </span>
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
      {tags.length > 0 && (
        <div className="layers-tags" role="group" aria-label="Filter by tag">
          {tags.map((tag) => (
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
        {p.visible.size === 0 && <p className="layers-empty">No component matches. Clear the search or a tag.</p>}
      </nav>
    </aside>
  );
}
