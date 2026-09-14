"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ComboboxEvents, type ComboboxProps } from "./core";

export type ComboboxComponentProps = Partial<ComboboxProps> & Handlers<ComboboxEvents> & WrapperProps;

/** An editable field that filters a listbox without replacing typed text during keyboard navigation. */
export function Combobox({ className, style, palette, ...props }: ComboboxComponentProps) {
  const ref = usePica<ComboboxProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
