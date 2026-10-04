"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiComparisonGridProps, type AsciiComparisonGridEvents } from "./core";

export type AsciiComparisonGridComponentProps = Partial<AsciiComparisonGridProps> & WrapperProps & Handlers<AsciiComparisonGridEvents>;

/** An aligned character specimen matrix with selectable columns and readable material measurements. */
export function AsciiComparisonGrid({ className, style, palette, ...props }: AsciiComparisonGridComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
