"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EmptyStateProps } from "./core";

export type EmptyStateComponentProps = Partial<EmptyStateProps> & WrapperProps;

/** A measured empty state with a box drawn mark, supporting copy, and one quiet action. */
export function EmptyState({ className, style, palette, ...props }: EmptyStateComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
