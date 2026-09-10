// Hard constraints from AGENTS.md are enforced here rather than by convention: components make no network
// requests; cores depend on nothing outside lib/, apart from sections composing other cores; only
// lib/loop.ts schedules frames; only lib/events.ts dispatches events; only lib/gl.ts opens WebGL2; only
// lib/palette.ts reads the palette's custom properties; and no component hard-codes a color.
// test/invariants.test.ts greps for the same violations, so each rule survives this file being disabled.
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

const NO_NETWORK = "Pica components make no network requests. See AGENTS.md.";
const ONE_LOOP = "Only lib/loop.ts schedules frames, so every animation stops offscreen and honors reduced motion. See AGENTS.md.";
const SEEDED = "Randomness comes from lib/rng.ts with the seed prop, so every capture is reproducible. See AGENTS.md.";
const LIB_ONLY = "Cores and lib/ import nothing outside lib/, so a component pastes into any project with no install. See AGENTS.md.";
const SECTION_IMPORTS =
  "A section imports lib/ and other components' cores, one level deep, as import * as <slug in camelCase>. See docs/decisions/0007-composition-and-budgets.md.";

const network = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map((name) => ({ name, message: NO_NETWORK }));
const frames = ["requestAnimationFrame", "setInterval"].map((name) => ({ name, message: ONE_LOOP }));

const EVENTS_ONLY = {
  selector: 'CallExpression[callee.property.name="dispatchEvent"]',
  message: "A core reports events through emitter() from lib/events.ts, so every event has the same name and shape. See AGENTS.md.",
};
const GL_ONLY = {
  selector: 'CallExpression[callee.property.name="getContext"][arguments.0.value="webgl2"]',
  message: "Only lib/gl.ts opens a WebGL2 context, so every shader gets context-loss handling and a fallback. See AGENTS.md.",
};
const PALETTE_ONLY = {
  selector: 'CallExpression[callee.property.name="getPropertyValue"][arguments.0.value=/^--pica-/]',
  message: "Read the palette through lib/palette.ts, which resolves it exactly as the page does. See AGENTS.md.",
};
const COLOR = String.raw`/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]/`;
const COLOR_MESSAGE = "Components inherit their colors: use cssVar or watchPalette from lib/palette.ts, not a color literal. See STYLE.md.";
const NO_COLOR = [
  { selector: `Literal[value=${COLOR}]`, message: COLOR_MESSAGE },
  { selector: `TemplateElement[value.raw=${COLOR}]`, message: COLOR_MESSAGE },
];

export default defineConfig(
  { ignores: [".next/**", "out/**", ".pica/**", "public/**", "node_modules/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["lib/**/*.ts", "registry/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", ...network, ...frames],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "fetch", message: NO_NETWORK },
        { object: "globalThis", property: "fetch", message: NO_NETWORK },
        { object: "window", property: "requestAnimationFrame", message: ONE_LOOP },
        { object: "Math", property: "random", message: SEEDED },
      ],
    },
  },
  {
    files: ["lib/loop.ts"],
    rules: { "no-restricted-globals": ["error", ...network] },
  },
  // Each of these jobs has one owner in lib/. Later blocks override earlier ones for the files they name.
  { files: ["lib/**/*.ts"], rules: { "no-restricted-syntax": ["error", EVENTS_ONLY, GL_ONLY, PALETTE_ONLY] } },
  { files: ["lib/events.ts"], rules: { "no-restricted-syntax": ["error", GL_ONLY, PALETTE_ONLY] } },
  { files: ["lib/gl.ts"], rules: { "no-restricted-syntax": ["error", EVENTS_ONLY, PALETTE_ONLY] } },
  { files: ["lib/palette.ts"], rules: { "no-restricted-syntax": ["error", EVENTS_ONLY, GL_ONLY] } },
  { files: ["registry/**/*.{ts,tsx}"], rules: { "no-restricted-syntax": ["error", EVENTS_ONLY, GL_ONLY, PALETTE_ONLY, ...NO_COLOR] } },
  {
    files: ["lib/**/*.ts"],
    ignores: ["lib/use-pica.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [{ regex: "^(?!\\./)", message: LIB_ONLY }] }] },
  },
  {
    files: ["registry/**/core.ts", "registry/**/meta.ts"],
    ignores: ["registry/sections/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [{ regex: "^(?!\\.\\./\\.\\./\\.\\./lib/)", message: LIB_ONLY }] }] },
  },
  {
    files: ["registry/sections/**/core.ts", "registry/sections/**/meta.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ regex: "^(?!\\.\\./\\.\\./\\.\\./lib/|\\.\\./\\.\\./(?!sections/)[a-z-]+/[a-z0-9-]+/core$)", message: SECTION_IMPORTS }],
      }],
    },
  },
  {
    files: ["registry/**/index.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^(?!react$|\\./core$|(\\.\\./)+lib/use-pica$)",
          message: "A wrapper imports react, ./core, and lib/use-pica only. See AGENTS.md.",
        }],
      }],
    },
  },
);
