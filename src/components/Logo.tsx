import { LOGO_COLS, LOGO_PATH, LOGO_ROWS, LOGO_VIEWBOX } from "@/lib/logo";

/** The Picagram wordmark. It takes the text color. A height that is a multiple of 13 px, the mark's height in
 *  font pixels, puts every pixel of it on whole screen pixels. */
export function Logo({ height = 26 }: { height?: number }) {
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
