# Manual checklist

What neither a test nor `npm run verify` can see. Check these in the review sheet or the catalog before a wave ships.

## Every component

- It follows STYLE.md:
  - one ink color, with the accent in one place;
  - tone from measured density;
  - restraint over spectacle;
  - no hue cycling, no glow, and no green-on-black default.
- With no props set, the default already looks finished.
- At the default speed, the motion reads as calm and has no visible loop seam.
- It looks intentional on a light page as well as a dark one.
- Text drawn in the accent reaches 4.5:1 on both grounds, and a data stroke in the accent reaches 3:1. axe cannot measure SVG text or canvas glyphs, so check them with a contrast picker.
- It still looks intentional with a brand palette: a strong accent, and a fg that is not grey.
- It stays legible at 390 px wide.
- A pasted copy works in a fresh Next.js app, and as a plain HTML file opened from disk.

## By kind

- **Controls:**
  - every key the WAI-ARIA pattern lists works;
  - focus is always visible;
  - it feels like the platform's own control, only drawn in Pica's grammar.
- **Charts:**
  - the numbers read at a glance in both the SVG and the glyph look;
  - labels never collide at 390 px.
- **Shaders:**
  - two tones only;
  - calm;
  - quieter than type set over them;
  - the fallback without WebGL2 still looks deliberate.
- **Sections:**
  - the headline and copy look right in the page's own font;
  - the section holds up with realistic copy, both short and long.
