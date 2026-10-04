"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiCircuitBoardProps, type AsciiCircuitBoardEvents } from "./core";

export type AsciiCircuitBoardComponentProps = Partial<AsciiCircuitBoardProps> & WrapperProps & Handlers<AsciiCircuitBoardEvents>;

/** A character series circuit schematic with a selectable component inventory and readable terminal facts. */
export function AsciiCircuitBoard({ className, style, palette, ...props }: AsciiCircuitBoardComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
