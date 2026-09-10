"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TestimonialsProps } from "./core";

export type TestimonialsComponentProps = Partial<TestimonialsProps> & WrapperProps;

/** Quotes as a grid of cards, or as one quote at a time that rotates on a timer with previous and next controls. */
export function Testimonials({ className, style, palette, ...props }: TestimonialsComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
