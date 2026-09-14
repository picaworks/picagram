"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ToggleGroupEvents, type ToggleGroupProps } from "./core";

export type ToggleGroupComponentProps = Partial<ToggleGroupProps> & Handlers<ToggleGroupEvents> & WrapperProps;

/** A toolbar of independent buttons that can each be pressed or released. */
export function ToggleGroup({ className, style, palette, ...props }: ToggleGroupComponentProps) {
  const ref = usePica<ToggleGroupProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
