"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PaginationEvents, type PaginationProps } from "./core";

export type PaginationComponentProps = Partial<PaginationProps> & Handlers<PaginationEvents> & WrapperProps;

/** A compact navigation list that folds distant pages and reports each activated destination. */
export function Pagination({ className, style, palette, ...props }: PaginationComponentProps) {
  const ref = usePica<PaginationProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
