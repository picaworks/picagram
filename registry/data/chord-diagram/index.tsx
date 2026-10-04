"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ChordDiagramEvents, type ChordDiagramProps } from "./core";

export type ChordDiagramComponentProps = Partial<ChordDiagramProps> & WrapperProps & Handlers<ChordDiagramEvents>;

/** A weighted relationship matrix drawn as labeled ribbons with keyboard endpoint selection. */
export function ChordDiagram({ className, style, palette, ...props }: ChordDiagramComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
