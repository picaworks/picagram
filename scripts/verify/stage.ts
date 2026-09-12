/** Writes the pages verify opens for one component, under .pica/<slug>/: the vanilla file exactly as users
 *  get it, a React harness around the single React file, and, for a component that wraps children, a
 *  vanilla page holding probe children. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { ROOT, type Entry } from "../catalog";
import { DEMO_PAGE_CSS } from "../config";
import { reactSingleFile, vanillaBundle, vanillaHtml, type VanillaBundle } from "../single-file";

export const WORK = join(ROOT, ".pica");

/** Children verify puts inside a wrapping component, to prove they stay readable, reachable, and untouched:
 *  the markup, a text that must reach the accessibility tree, and the label of something Tab must reach. */
export interface Probe {
  readonly markup: string;
  readonly heading: string;
  readonly action: string;
}

const PROBES: Readonly<Record<"content" | "panels" | "label", Probe>> = {
  content: {
    markup: '<h2 data-probe>Probe heading</h2><p data-probe>Probe paragraph</p><button type="button" data-probe>Probe button</button>',
    heading: "Probe heading",
    action: "Probe button",
  },
  panels: {
    markup:
      '<section data-probe><h2>First panel</h2><button type="button">First action</button></section><section data-probe><h2>Second panel</h2><p>Second text</p></section>',
    heading: "First panel",
    action: "First action",
  },
  // A button holds phrasing content only, and is itself what Tab reaches.
  label: { markup: "<span data-probe>Probe label</span>", heading: "Probe label", action: "Probe label" },
};

/** The probe for a wrapping component, chosen by what its host can hold. */
export function probeFor(meta: Entry["meta"]): Probe {
  if (meta.host === "button") return PROBES.label;
  return meta.wraps === "panels" ? PROBES.panels : PROBES.content;
}

export interface Staged {
  readonly bundle: VanillaBundle;
  readonly gzipBytes: number;
  /** True when lib/gl.ts is in the component's import graph. */
  readonly gpu: boolean;
  /** The pages written, as paths under .pica/. */
  readonly pages: { readonly vanilla: string; readonly vanillaProbe: string | null; readonly react: string };
}

/** The React harness: mounts the component with window.PICA_PROPS, builds its children from markup as real
 *  React elements so both shapes hold the same DOM, logs every event its handlers receive, and can control
 *  one prop from its event (window.PICA_ECHO). */
function harness(entry: Entry): string {
  const inline = entry.meta.stage === "inline";
  return `import { createElement, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ${entry.exportName} } from "./react";

type Echo = { prop: string; event: string; mode: "echo" | "ignore" };
const w = window as unknown as { PICA_PROPS?: Record<string, unknown>; PICA_CHILDREN?: string; PICA_ECHO?: Echo; PICA_LOG: unknown[] };
const EVENTS: string[] = ${JSON.stringify(Object.keys(entry.events))};
const DEMO = ${JSON.stringify(entry.meta.demo?.children ?? "")};

function toReact(node: ChildNode, key: number): ReactNode {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1) return null;
  const el = node as Element;
  const props: Record<string, unknown> = { key };
  for (const attr of Array.from(el.attributes)) {
    props[attr.name === "class" ? "className" : attr.name === "for" ? "htmlFor" : attr.name] = attr.value;
  }
  return createElement(el.tagName.toLowerCase(), props, ...Array.from(el.childNodes).map(toReact));
}

function App() {
  const initial = w.PICA_PROPS ?? {};
  const echo = w.PICA_ECHO;
  const [held, setHeld] = useState<unknown>(echo ? initial[echo.prop] : undefined);
  const handlers: Record<string, (detail: unknown) => void> = {};
  for (const name of EVENTS) {
    handlers["on" + name.charAt(0).toUpperCase() + name.slice(1)] = (detail) => {
      w.PICA_LOG.push({ via: "react", name, detail });
      if (echo && echo.mode === "echo" && echo.event === name) setHeld(detail);
    };
  }
  const props = echo ? { ...initial, [echo.prop]: held } : initial;
  const template = document.createElement("template");
  template.innerHTML = w.PICA_CHILDREN ?? DEMO;
  const children = Array.from(template.content.childNodes).map(toReact);
  const element = createElement(${entry.exportName} as never, { ...props, ...handlers } as never, ...children);
  return ${inline ? 'createElement("div", { className: "pica-stage" }, element)' : "element"};
}

createRoot(document.getElementById("root")!).render(createElement(App));
`;
}

export async function stage(entry: Entry): Promise<Staged> {
  const { slug } = entry.meta;
  const dir = join(WORK, slug);
  await mkdir(dir, { recursive: true });
  const bundle = await vanillaBundle(entry);
  await writeFile(join(dir, "vanilla.html"), vanillaHtml(entry, bundle));
  let vanillaProbe: string | null = null;
  if (entry.meta.wraps) {
    const children = probeFor(entry.meta).markup;
    const probed: Entry = { ...entry, meta: { ...entry.meta, demo: { ...entry.meta.demo, children } } };
    await writeFile(join(dir, "vanilla-probe.html"), vanillaHtml(probed, bundle));
    vanillaProbe = `${slug}/vanilla-probe.html`;
  }
  await writeFile(join(dir, "react.tsx"), await reactSingleFile(entry));
  await writeFile(join(dir, "harness.tsx"), harness(entry));
  const built = await build({
    entryPoints: [join(dir, "harness.tsx")],
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    target: "es2020",
    define: { "process.env.NODE_ENV": '"production"' },
    absWorkingDir: ROOT,
    logLevel: "silent",
    charset: "utf8",
  });
  const js = built.outputFiles?.[0]?.text ?? "";
  await writeFile(
    join(dir, "react.html"),
    `<!doctype html><html lang="en"${entry.meta.stage === "flow" ? ' data-stage="flow"' : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><title>${entry.meta.title} · React</title><style>${DEMO_PAGE_CSS}\n#root { width: 100%; height: 100%; }</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
  );
  await writeFile(
    join(dir, "meta.json"),
    `${JSON.stringify({ ...entry.meta, exportName: entry.exportName, gzipBytes: bundle.gzipBytes }, null, 2)}\n`,
  );
  return {
    bundle,
    gzipBytes: bundle.gzipBytes,
    gpu: bundle.js.includes('"webgl2"'),
    pages: { vanilla: `${slug}/vanilla.html`, vanillaProbe, react: `${slug}/react.html` },
  };
}
