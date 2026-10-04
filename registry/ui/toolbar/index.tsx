"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ToolbarEvents, type ToolbarProps } from "./core";

export type ToolbarComponentProps = Partial<ToolbarProps> & Handlers<ToolbarEvents> & WrapperProps;

/** A roving focus toolbar for related action and toggle controls. */
export function Toolbar({ className, style, palette, ...props }: ToolbarComponentProps) {
  const ref = usePica<ToolbarProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
