"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TextareaEvents, type TextareaProps } from "./core";

export type TextareaComponentProps = Partial<TextareaProps> & Handlers<TextareaEvents> & WrapperProps;

/** A labelled text field that grows with its content and reports every input. */
export function Textarea({ className, style, palette, ...props }: TextareaComponentProps) {
  const ref = usePica<TextareaProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
