"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type InputEvents, type InputProps } from "./core";

export type InputComponentProps = Partial<InputProps> & Handlers<InputEvents> & WrapperProps;

/** A native text field with controlled and uncontrolled values and keyboard event reporting. */
export function Input({ className, style, palette, ...props }: InputComponentProps) {
  const ref = usePica<InputProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
