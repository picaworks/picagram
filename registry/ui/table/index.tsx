"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TableEvents, type TableProps } from "./core";

export type TableComponentProps = Partial<TableProps> & Handlers<TableEvents> & WrapperProps;

/** A semantic data table with native headings, tabular figures, and optional three-state sorting. */
export function Table({ className, style, palette, ...props }: TableComponentProps) {
  const ref = usePica<TableProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
