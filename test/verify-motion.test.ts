import { afterEach, describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";
import { motion } from "../scripts/verify/motion";
import type { Ctx } from "../scripts/verify/types";

const probe = vi.hoisted(() => ({ now: 0, moving: true, dark: Buffer.alloc(0), light: Buffer.alloc(0) }));

vi.mock("../scripts/verify/page", async (original) => {
  const actual = await original<typeof import("../scripts/verify/page")>();
  return {
    ...actual,
    clipOf: async () => null,
    open: async (context: { reduced: boolean }) => {
      let captures = 0;
      return {
        evaluate: async () => undefined,
        locator: () => ({ first: () => ({}) }),
        waitForTimeout: async (ms: number) => { probe.now += ms; },
        screenshot: async () => {
          captures++;
          probe.now += captures === 1 ? 4000 : 1000;
          return !context.reduced && probe.moving && captures > 1 ? probe.light : probe.dark;
        },
      };
    },
  };
});

function image(level: number): Buffer<ArrayBuffer> {
  const png = new PNG({ width: 2, height: 2 });
  png.data.fill(level);
  for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
  return Buffer.from(PNG.sync.write(png));
}

async function observe(moving: boolean) {
  probe.now = 0;
  probe.moving = moving;
  probe.dark = image(0);
  probe.light = image(255);
  vi.spyOn(Date, "now").mockImplementation(() => probe.now);
  const checks: Ctx["checks"] = [];
  const ctx = {
    entry: { meta: {} }, quick: true, checks, errors: [], url: (shape: string) => shape,
    context: async (options?: { reducedMotion?: string }) => ({
      reduced: options?.reducedMotion === "reduce", close: async () => undefined,
    }),
  } as unknown as Ctx;
  await motion(ctx);
  return checks;
}

afterEach(() => vi.restoreAllMocks());

describe("motion sampling", () => {
  it("observes both shapes after an initial screenshot takes longer than the sampling window", async () => {
    const checks = await observe(true);
    expect(checks.filter((check) => check.name.startsWith("animates"))).toEqual([
      expect.objectContaining({ name: "animates", ok: true }),
      expect.objectContaining({ name: "animates in react", ok: true }),
    ]);
  });

  it("still rejects unchanged frames after a slow initial screenshot", async () => {
    const checks = await observe(false);
    expect(checks.filter((check) => check.name.startsWith("animates")).every((check) => !check.ok)).toBe(true);
    expect(checks.find((check) => check.name === "still under reduced motion")?.ok).toBe(true);
  });
});
