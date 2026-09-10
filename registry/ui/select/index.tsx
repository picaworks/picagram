"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SelectEvents, type SelectProps } from "./core";

export type SelectComponentProps = Partial<SelectProps> & Handlers<SelectEvents> & WrapperProps;

/** A single-choice select, built on the WAI-ARIA select-only combobox pattern with a Popover API listbox. */
export function Select({ className, style, palette, ...props }: SelectComponentProps) {
  const ref = usePica<SelectProps>(mount, props);
  return <div ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
