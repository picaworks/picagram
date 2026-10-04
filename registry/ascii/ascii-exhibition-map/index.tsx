"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiExhibitionMapProps, type AsciiExhibitionMapEvents } from "./core";
export type AsciiExhibitionMapComponentProps = Partial<AsciiExhibitionMapProps> & WrapperProps & Handlers<AsciiExhibitionMapEvents>;
/** A floor plan drawn in box-drawing glyphs from room rectangles and doors, with a route-ordered room list that selects one room. */
export function AsciiExhibitionMap({ className, style, palette, ...props }: AsciiExhibitionMapComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
