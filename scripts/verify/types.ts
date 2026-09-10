/** What every verify module shares. */
import type { Browser, BrowserContext, BrowserContextOptions } from "@playwright/test";
import type { Entry } from "../catalog";
import type { Staged } from "./stage";

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

/** The pages staged for one component. "vanilla-probe" exists only for components that wrap children. */
export type Shape = "vanilla" | "vanilla-probe" | "react";

export interface Ctx {
  readonly browser: Browser;
  readonly entry: Entry;
  readonly staged: Staged;
  /** One viewport and no long-task check, for iterating while the machine is busy. */
  readonly quick: boolean;
  readonly checks: Check[];
  /** Console errors and uncaught exceptions from every page opened for this component. */
  readonly errors: string[];
  /** Where this component's captures go. */
  readonly captures: string;
  /** Props every capture uses: the demo props, plus a fixed time and seed for animated components. */
  readonly base: Record<string, unknown>;
  /** The URL of one of this component's staged pages. */
  url(shape: Shape): string;
  /** A browser context with verify's defaults: 1280 by 800, dark, en-US, one device pixel per CSS pixel,
   *  and camera access for the fake camera. */
  context(options?: BrowserContextOptions): Promise<BrowserContext>;
}
