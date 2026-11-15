"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type KnurledDrumProps } from "./core";

export type KnurledDrumComponentProps = Partial<KnurledDrumProps> & WrapperProps;

/** A finite metal drum turns its raised diamond grip between plain machined rings. */
export function KnurledDrum({ className, style, palette, ...props }: KnurledDrumComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
