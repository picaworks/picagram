/** Every component's meta agrees with its directory, its core, and its wrapper. See docs/testing/invariants.md. */
import { readFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { TOKENS } from "../lib/palette";
import { loadAll } from "../scripts/catalog";

const entries = await loadAll();
const MOTION = ["paused", "time", "seed"];

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
});
