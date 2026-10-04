"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiExhibitionMapProps, type AsciiExhibitionMapEvents } from "./core";
export type AsciiExhibitionMapComponentProps = Partial<AsciiExhibitionMapProps> & WrapperProps & Handlers<AsciiExhibitionMapEvents>;
/** An exhibition guide with an aligned character floor plan, numbered room selection, practical access notes and a linear visiting route. */
export function AsciiExhibitionMap({ className, style, palette, ...props }: AsciiExhibitionMapComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
