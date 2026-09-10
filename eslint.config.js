// Three hard constraints from AGENTS.md are enforced here rather than by convention:
// components make no network requests, cores depend on nothing outside lib/, and only
// lib/loop.ts schedules frames. test/invariants.test.ts greps for the same violations,
// so each rule survives this file being disabled.
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

const NO_NETWORK = "Pica components make no network requests. See AGENTS.md.";
const ONE_LOOP = "Only lib/loop.ts schedules frames, so every animation stops offscreen and honors reduced motion. See AGENTS.md.";
const SEEDED = "Randomness comes from lib/rng.ts with the seed prop, so every capture is reproducible. See AGENTS.md.";

const network = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map((name) => ({ name, message: NO_NETWORK }));
const frames = ["requestAnimationFrame", "setInterval"].map((name) => ({ name, message: ONE_LOOP }));

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
  {
    files: ["lib/**/*.ts", "registry/**/core.ts", "registry/**/meta.ts"],
    ignores: ["lib/use-pica.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^[^.]",
          message: "Cores and lib/ import nothing outside lib/, so a component pastes into any project with no install. See AGENTS.md.",
        }],
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
