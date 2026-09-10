# 0006: Shaders run on WebGL2 through lib/gl.ts; vgpu is not the default runtime

Date: 2026-09-10. Status: accepted. The vgpu measurements come from the spike in wave 3 and will be added here.

Context: Rish wants shaders and gradients as first-class components. He asked for our own WebGL2 runtime, plus a test of Vercel's vgpu. Two alternatives were rejected.
- **vgpu as the default runtime.**
  - Version 0.4.1 is WebGPU only, with no fallback.
  - Its own figure for one fullscreen effect is 25 KB gzipped, four times the budget.
  - Its headless captures come out black on Linux.
  - It is an npm dependency, which neither single-file shape can carry.
- **A frame loop inside the GPU runtime.** It would duplicate `createLoop` and break the rule that only `lib/loop.ts` schedules frames.

Decision: `lib/gl.ts` exports `createShader(host, options)`.
- **What it draws.** One fullscreen triangle, with a GLSL ES 3.00 fragment that follows a fixed prelude:
  - resolution;
  - time, wrapped every hour;
  - seed;
  - pointer;
  - the four palette colors;
  - an integer hash.
- **Who owns the frames.** The core owns the loop. The runtime tells it to redraw after a resize, a palette change, or a restored context.
- **Without WebGL2,** the canvas shows a CSS fallback built from palette tokens.
- **Snippets.** `lib/glsl.ts` adds optional gradient noise and an 8 by 8 Bayer threshold.
- **Size.** The runtime measures about 1 KB gzipped.

Consequences:
- Only `lib/gl.ts` opens a WebGL2 context. `eslint.config.js` and `test/invariants.test.ts` check this.
- `npm run verify` launches Chromium on the SwiftShader software renderer, and fails unless the renderer string names it, so every machine renders captures the same way.
- For every shader component, `npm run verify` also:
  - loses the context, restores it, and requires the same picture;
  - stubs out WebGL2 and requires the fallback to show.
- The vgpu spike builds `mesh-gradient` in WGSL and records its size, its headless behavior, and its determinism here. A later decision may add a separate tier for it.
