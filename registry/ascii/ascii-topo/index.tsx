"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiTopoProps } from "./core";

export type AsciiTopoComponentProps = Partial<AsciiTopoProps> & WrapperProps;

/** Contour lines of a slowly drifting noise field, drawn as directional line glyphs. */
export function AsciiTopo({ className, style, palette, ...props }: AsciiTopoComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
