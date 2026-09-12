/** Every component's meta agrees with its directory, its core, and its wrapper. See docs/testing/invariants.md. */
import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { FACETS } from "../lib/meta";
import { TOKENS } from "../lib/palette";
import { loadAll, REGISTRY, takesImage } from "../scripts/catalog";
import { CODE_HOSTS } from "./helpers";

const entries = await loadAll();
const MOTION = ["paused", "time", "seed"];
/** Helpers from lib/chart.ts that actually plot. formatNumber alone labels a figure and makes no chart. */
const PLOTTERS = ["dataTable", "linePath", "areaPath", "arcPath", "bandScale", "linearScale", "niceTicks"];

function libsIn(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/from "(?:\.\.\/)+lib\/([\w-]+)"/g)) if (match[1]) out.push(match[1]);
  return out;
}

/** What each component's code reaches. `own` is its own core's imports, which say how it draws. `deep` also
 *  follows the cores a section composes, one level, because a section that mounts a shader ships that
 *  shader's WebGL inside its own file. */
const reach = new Map<string, { own: Set<string>; deep: Set<string>; plots: boolean }>();
for (const entry of entries) {
  const source = await readFile(entry.core, "utf8");
  const sources = [source];
  for (const match of source.matchAll(/from "\.\.\/\.\.\/([a-z-]+)\/([a-z0-9-]+)\/core"/g)) {
    sources.push(await readFile(join(REGISTRY, String(match[1]), String(match[2]), "core.ts"), "utf8"));
  }
  const named = /import \{([^}]+)\} from "(?:\.\.\/)+lib\/chart"/.exec(source)?.[1] ?? "";
  reach.set(entry.meta.slug, {
    own: new Set(libsIn(source)),
    deep: new Set(sources.flatMap(libsIn)),
    plots: PLOTTERS.some((helper) => named.includes(helper)),
  });
}
const reachOf = (slug: string) => reach.get(slug) ?? { own: new Set<string>(), deep: new Set<string>(), plots: false };

describe.each(entries.map((e) => [e.meta.slug, e] as const))("%s", (_slug, entry) => {
  const { meta, defaults, docs } = entry;

  it("defaults survive a JSON round trip: no undefined, function, or NaN", () => {
    expect(JSON.parse(JSON.stringify(defaults))).toEqual(defaults);
  });

  it("each control fits the kind of its default", () => {
    for (const [name, control] of Object.entries(meta.controls)) {
      const value = defaults[name];
      const fits =
        control.type === "number" ? typeof value === "number" || value === null
        : control.type === "boolean" ? typeof value === "boolean"
        : control.type === "select" ? control.options.includes(String(value))
        : control.type === "numbers" ? Array.isArray(value) && value.every((v) => typeof v === "number")
        : control.type === "json" ? typeof value === "object" && value !== null
        : typeof value === "string";
      expect(fits, `control "${name}" is ${control.type} but the default is ${JSON.stringify(value)}`).toBe(true);
    }
  });

  it("palette tokens are real tokens", () => {
    for (const token of meta.palette ?? []) expect(TOKENS, `palette token "${token}"`).toContain(token);
  });

  it("each controlled prop starts uncontrolled, has a default sibling, and names an event the core declares", () => {
    for (const [prop, event] of Object.entries(meta.controlled ?? {})) {
      expect(defaults[prop], `${prop} defaults to null, meaning uncontrolled`).toBeNull();
      expect(Object.keys(defaults), prop).toContain(`default${prop.charAt(0).toUpperCase()}${prop.slice(1)}`);
      expect(Object.keys(entry.events), prop).toContain(event);
    }
  });

  it("the wrapper renders children exactly when meta.wraps is set, and takes on props exactly when the core has events", async () => {
    const wrapper = await readFile(entry.wrapper, "utf8");
    expect(wrapper.includes("{children}"), "renders {children}").toBe(Boolean(meta.wraps));
    expect(wrapper.includes("Handlers<"), "extends Handlers").toBe(Object.keys(entry.events).length > 0);
  });

  it("the wrapper renders the host element the demo page mounts on", async () => {
    const tag = meta.host ?? (meta.stage === "inline" ? "span" : "div");
    expect(await readFile(entry.wrapper, "utf8"), `renders <${tag} ref={ref}>`).toMatch(new RegExp(`<${tag} ref=\\{ref\\}`));
  });

  it("slug and category match its directory", () => {
    expect(meta.slug).toBe(basename(entry.dir));
    expect(meta.category).toBe(basename(dirname(entry.dir)));
  });

  it("every inspector control names a prop in the core's defaults", () => {
    for (const name of Object.keys(meta.controls)) expect(Object.keys(defaults), `control "${name}"`).toContain(name);
  });

  it("every prop has a JSDoc description", () => {
    for (const name of Object.keys(defaults)) expect(docs[name], `prop "${name}" has no JSDoc`).toBeTruthy();
  });

  it("names what it builds on, or is marked original", () => {
    expect(meta.credits.length > 0 || meta.original === true).toBe(true);
    for (const credit of meta.credits) {
      expect(credit.url, credit.title).toMatch(/^https:\/\//);
      expect(credit.license, credit.title).toBeTruthy();
    }
  });

  it("animated components accept the motion props", () => {
    for (const name of MOTION) {
      if (meta.animated) expect(Object.keys(defaults), `animated component lacks "${name}"`).toContain(name);
    }
  });

  it("has a one-sentence description", () => {
    expect(meta.description).toMatch(/^[A-Z][^.]*\.$/);
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });

  // The catalog filters by these twelve and by nothing else, so each one has to keep meaning the same thing
  // across 92 components. Every facet a machine can decide is decided here, from the component itself.
  it("declares facets that match what it is", () => {
    const facets = new Set(meta.facets);
    expect(facets.size, "the same facet is listed twice").toBe(meta.facets.length);
    for (const facet of meta.facets) expect(FACETS, `unknown facet "${facet}"`).toContain(facet);
    const { own, deep } = reachOf(meta.slug);
    expect(facets.has("animated"), "animated follows meta.animated").toBe(meta.animated);
    expect(facets.has("static"), "static is the other half of animated").toBe(!meta.animated);
    expect(facets.has("image"), "image means verify hands it a photograph").toBe(takesImage(entry));
    expect(facets.has("webgl"), "webgl means lib/gl.ts ships in its file").toBe(deep.has("gl"));
    expect(facets.has("shader"), "shader is the shaders category").toBe(meta.category === "shaders");
    expect(facets.has("canvas"), "canvas means its own core draws on a 2D canvas").toBe(own.has("canvas") && !deep.has("gl"));
  });

  // These three say "at least". A component may carry one for a reason no machine can see, such as a
  // sparkline that plots without lib/chart.ts, but it may never lack one its own code implies.
  it("carries the facets its code implies", () => {
    const facets = new Set(meta.facets);
    const { own, plots } = reachOf(meta.slug);
    const operated =
      Object.keys(entry.events).length > 0 ||
      (meta.interactions?.length ?? 0) > 0 ||
      Object.keys(meta.controlled ?? {}).length > 0;
    if (operated) expect(facets.has("interactive"), "it reports events or runs scripted interactions").toBe(true);
    if (plots) expect(facets.has("chart"), "it plots with lib/chart.ts").toBe(true);
    if (meta.category === "dither" || own.has("dither")) expect(facets.has("dither"), "it dithers").toBe(true);
  });

  // A technique is cited from a paper or a standard, and a look from the shot it was re-implemented from, so
  // neither needs a page that shows code. Four credits in waves 1 and 2 predate the rule and stay as they are.
  it("from wave 4 on, cites nothing that shows code", () => {
    if (meta.wave < 4) return;
    for (const credit of meta.credits) {
      if (credit.relation === "port-of") continue; // Ported code names the repository its license travels from.
      const host = new URL(credit.url).hostname.replace(/^www\./, "");
      const named = CODE_HOSTS.find((code) => host === code || host.endsWith(`.${code}`));
      expect(named, `${credit.relation} "${credit.title}" points at ${host}`).toBeUndefined();
    }
  });
});
