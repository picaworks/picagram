"use client";
import { useState, type KeyboardEvent } from "react";
import type { CatalogItem, PaletteProp, Props } from "@/lib/catalog";
import { useFileText, type FileState } from "@/lib/files";
import { installCommand, reactSnippet, withPicaProps } from "@/lib/props";
import { CopyButton } from "./CopyButton";

const TABS = [
  ["react", "React"],
  ["html", "HTML"],
  ["install", "Install"],
  ["llm", "LLM"],
] as const;
type Tab = (typeof TABS)[number][0];

interface CodeTabsProps {
  item: CatalogItem;
  overrides: Props;
  palette: PaletteProp;
}

/** React, HTML, Install, and LLM, each with a copy button that bakes in the current values. */
export function CodeTabs({ item, overrides, palette }: CodeTabsProps) {
  const [tab, setTab] = useState<Tab>("react");
  const react = useFileText(tab === "react" ? `/react/${item.slug}.tsx` : null);
  const html = useFileText(tab === "html" ? `/v/${item.slug}.html` : null);

  const snippet = reactSnippet(item.exportName, overrides, palette, item.demo?.children);
  const baked = html.text === null ? null : withPicaProps(html.text, overrides, palette);
  const paletteSet = Object.values(palette).some(Boolean);
  const install = installCommand(item.slug);
  const twin = `/c/${item.slug}.md`;
  const twinUrl = typeof window === "undefined" ? twin : new URL(twin, window.location.href).href;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const ids = TABS.map(([id]) => id);
    const at = ids.indexOf(tab);
    let next: Tab | undefined;
    if (e.key === "ArrowRight") next = ids[(at + 1) % ids.length];
    else if (e.key === "ArrowLeft") next = ids[(at - 1 + ids.length) % ids.length];
    else if (e.key === "Home") next = ids[0];
    else if (e.key === "End") next = ids[ids.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <div className="tabs">
      <div className="tablist" role="tablist" aria-label="Code">
        {TABS.map(([id, name]) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={onTabKey}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="tabpanel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "react" && (
          <>
            <div className="code-head">
              <span className="label">usage</span>
              <CopyButton text={snippet} what="usage" />
            </div>
            <pre className="code">{snippet}</pre>
            <div className="code-head">
              <span className="label">/react/{item.slug}.tsx</span>
              <CopyButton text={react.text} what="React file" />
            </div>
            <FileBlock state={react} />
          </>
        )}
        {tab === "html" && (
          <>
            <div className="code-head">
              <span className="label">/v/{item.slug}.html</span>
              <CopyButton text={baked} what="HTML file" />
            </div>
            <FileBlock state={{ text: baked, error: html.error }} />
            <p className="tabs-note">
              {Object.keys(overrides).length > 0 || paletteSet
                ? "The current values are set as window.PICA_PROPS before the first script."
                : "Opens from disk with no build step. Change a control or the palette to bake values in."}
            </p>
          </>
        )}
        {tab === "install" && (
          <>
            <div className="code-head">
              <span className="label">shadcn</span>
              <CopyButton text={install} what="install command" />
            </div>
            <pre className="code">{install}</pre>
            <p className="tabs-note">Adds one file that imports only react. The HTML tab has the file that needs nothing.</p>
          </>
        )}
        {tab === "llm" && (
          <>
            <div className="code-head">
              <span className="label">for agents</span>
              <CopyButton text={twinUrl} what="markdown URL" />
            </div>
            <ul className="tabs-links">
              <li>
                <a href={twin}>{twin}</a>
                <span>This component as markdown, both files inline.</span>
              </li>
              <li>
                <a href="/llms.txt">/llms.txt</a>
                <span>The index, one line per component.</span>
              </li>
              <li>
                <a href="/llms-full.txt">/llms-full.txt</a>
                <span>Every component in one file.</span>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function FileBlock({ state }: { state: FileState }) {
  if (state.error) return <p className="code-status">Could not load the file: {state.error}</p>;
  if (state.text === null) return <p className="code-status">loading</p>;
  return (
    <pre className="code code-file" tabIndex={0}>
      {state.text}
    </pre>
  );
}
