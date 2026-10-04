"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ArchiveAisleEvents, type ArchiveAisleProps } from "./core";

export type ArchiveAisleComponentProps = Partial<ArchiveAisleProps> & Handlers<ArchiveAisleEvents> & WrapperProps;

/** A one-point archive aisle whose camera walks to each collection's bay, with numbered markers, a register and a readable detail. */
export function ArchiveAisle({ className, style, palette, ...props }: ArchiveAisleComponentProps) {
  const ref = usePica<ArchiveAisleProps>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
