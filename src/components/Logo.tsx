import { LOGO_COLS, LOGO_PATH, LOGO_ROWS, LOGO_VIEWBOX } from "@/lib/logo";

/** The Picagram wordmark. It takes the text color. A height that is a multiple of 13 px, the mark's height in
 *  font pixels, puts every pixel of it on whole screen pixels. The default, 39 px, is three screen pixels per
 *  pixel of the mark, and 180 px wide. */
export function Logo({ height = 39 }: { height?: number }) {
  return (
    <svg
      role="img"
      aria-label="Picagram"
      width={(height * LOGO_COLS) / LOGO_ROWS}
      height={height}
      viewBox={LOGO_VIEWBOX}
      fill="currentColor"
      shapeRendering="crispEdges"
    >
      <path d={LOGO_PATH} />
    </svg>
  );
}
