/** A wave is not finished while a Revise is still open. The contact sheet in scripts/review.mjs writes one
 *  file per wave; this reads them back. See docs/testing/README.md. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAll, ROOT } from "../scripts/catalog";
import { files, rel } from "./helpers";

const REVIEW = join(ROOT, "review");
/** The same three choices as DECISIONS in scripts/review.mjs, which this plain test cannot import. */
const DECISIONS = ["keep", "revise", "cut"];

interface Decision {
  decision: string;
  note: string;
  at: string;
}

/** Every committed review, keyed by the wave in its file name. */
async function reviews(): Promise<{ file: string; wave: number; log: Record<string, Decision> }[]> {
  const out: { file: string; wave: number; log: Record<string, Decision> }[] = [];
  for (const file of await files(REVIEW, [".json"])) {
    const named = /^review\/wave-(\d+)\.json$/.exec(rel(file));
    if (!named) continue;
    out.push({ file, wave: Number(named[1] ?? 0), log: JSON.parse(await readFile(file, "utf8")) as Record<string, Decision> });
  }
  return out;
}

describe("review", () => {
  it("decides every component in its wave", async () => {
    const logs = await reviews();
    const entries = logs.length > 0 ? await loadAll() : [];
    for (const { file, wave, log } of logs) {
      for (const { meta } of entries.filter((e) => e.meta.wave === wave)) {
        expect(Object.keys(log), `${rel(file)} leaves ${meta.slug} undecided`).toContain(meta.slug);
      }
    }
  });

  // Anything else means the sheet was edited by hand, and a decision nobody offered is a decision nobody made.
  it("records only decisions the sheet offers", async () => {
    for (const { file, log } of await reviews()) {
      for (const [slug, { decision }] of Object.entries(log)) {
        expect(DECISIONS, `${rel(file)} decides ${slug} as "${decision}"`).toContain(decision);
      }
    }
  });

  it("leaves nothing to revise", async () => {
    for (const { file, log } of await reviews()) {
      for (const [slug, { decision }] of Object.entries(log)) {
        expect(decision, `${rel(file)} still has ${slug} to revise`).not.toBe("revise");
      }
    }
  });
});
