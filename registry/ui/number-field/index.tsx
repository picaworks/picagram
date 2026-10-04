"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type NumberFieldEvents, type NumberFieldProps } from "./core";

export type NumberFieldComponentProps = Partial<NumberFieldProps> & Handlers<NumberFieldEvents> & WrapperProps;

/** A labelled number field with typed entry, keyboard stepping, and square decrement and increment buttons. */
export function NumberField({ className, style, palette, ...props }: NumberFieldComponentProps) {
  const ref = usePica<NumberFieldProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
