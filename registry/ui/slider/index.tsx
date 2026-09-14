"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SliderEvents, type SliderProps } from "./core";

export type SliderComponentProps = Partial<SliderProps> & Handlers<SliderEvents> & WrapperProps;

/** A labelled slider with stepped keyboard and pointer input in horizontal and vertical orientations. */
export function Slider({ className, style, palette, ...props }: SliderComponentProps) {
  const ref = usePica<SliderProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
