# Decisions

Short, dated records of choices that constrain the code. One file per decision. A decision stays until a later one supersedes it. When that happens, both remain and the newer one says so.

| # | Decision |
|---|---|
| 0001 | Pica is licensed MIT plus Commons Clause, and every generated copy carries the notice. |
| 0002 | Each component is one framework-free core plus a thin React wrapper, and both single-file shapes are generated from it. |
| 0003 | A component built from a captured design reference is re-implemented in a clean room, from a written spec that contains no code. |
| 0004 | Components hold JSON data, report events as non-bubbling CustomEvents on the host, and wrap children they never touch. |
| 0005 | The palette is four CSS custom properties, read only through `lib/palette.ts`, and the palette prop writes them onto the host. |
| 0006 | Shaders run on WebGL2 through `lib/gl.ts`, verified on the SwiftShader software renderer; vgpu is not the default runtime. |
| 0007 | Only sections compose other components, each composed core is scoped in the React file, and byte budgets are set per category. |
