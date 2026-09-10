# 0006: Shaders run on WebGL2 through lib/gl.ts; vgpu is not the default runtime

Date: 2026-09-10. Status: accepted. The vgpu figures below were measured in the wave 3 spike, against vgpu 0.4.1 on headless Chromium on macOS.

Context: Rish wants shaders and gradients as first-class components. He asked for our own WebGL2 runtime, plus a test of Vercel's vgpu. Two alternatives were rejected.
- **vgpu as the default runtime.**
  - Version 0.4.1 is WebGPU only, with no fallback.
  - One fullscreen effect measures 46,643 bytes gzipped, 5.7 times the 8 KB shaders budget. An earlier version of this record gave 25 KB, vgpu's own figure, against the old flat 6 KB budget. The spike measured almost twice that.
  - Headless captures depend on launch flags, and fail silently when one is missing. Research reported black captures on Linux; the spike did not test Linux.
  - It is an npm dependency. The HTML shape can inline its bundle, but the React shape could keep "imports only react" only by pasting about 145 KB of minified runtime into the file.
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

vgpu, measured. The spike ported `mesh-gradient` to WGSL, drove it with vgpu's browser API, and kept nothing in the repository.
- **Size.** One effect is 46,643 bytes gzipped, ten times `mesh-gradient`'s 4.6 KB, which includes all of the Pica runtime it uses. Most of the weight is a WGSL parser and reflector that `effect()` ships to the browser so it can set uniforms by name. `lib/gl.ts` gets the same lookup from the browser's own shader compiler, with no code of its own.
- **Headless rendering.** Headless Chromium renders it correctly with `--enable-unsafe-webgpu` plus an explicit `--use-angle=metal` or `--use-angle=swiftshader`. With the first flag alone the canvas stays blank, page script sees no error, and vgpu's error listener does not fire; only the browser console shows the failure. The same happens with no vgpu code on the page, so the cause is Chromium's backend selection, not vgpu.
- **Determinism.** Five fresh browser launches at a fixed time gave zero differing pixels.
- **Without WebGPU.** `navigator.gpu` still exists, but `requestAdapter()` resolves null, so feature detection has to request an adapter. vgpu has no fallback option, so each component would write its own detection and CSS swap. `createShader` does both once, from its `fallback` option.
- **API.** `effect.draw(surface)`, shown in vgpu's docs, throws for a canvas surface. The working form is `frame(gpu, (f) => f.pass(surface, effect))`.
- **Tooling.** `vgpu check` validated the shader and printed every uniform's offset, including a 12 byte alignment gap that is easy to get wrong by hand. `vgpu doctor` gave a clear health verdict. `lib/gl.ts` has no equivalent.

Consequences:
- Only `lib/gl.ts` opens a WebGL2 context. `eslint.config.js` and `test/invariants.test.ts` check this.
- `npm run verify` launches Chromium on the SwiftShader software renderer, and fails unless the renderer string names it, so every machine renders captures the same way.
- For every shader component, `npm run verify` also:
  - loses the context, restores it, and requires the same picture;
  - stubs out WebGL2 and requires the fallback to show.
- vgpu stays out of the registry. A later decision could revisit it for a component that needs WebGPU, compute for example. That component would need its own budget tier, a bundling path in `scripts/single-file.ts` for npm code, and a verify launch with `--enable-unsafe-webgpu --use-angle=swiftshader`, which the spike showed renders in software and deterministically.
