"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SpinnerProps } from "./core";

export type SpinnerComponentProps = Partial<SpinnerProps> & WrapperProps;

/** A quiet braille cell run that circles an inline status while work is under way. */
export function Spinner({ className, style, palette, ...props }: SpinnerComponentProps) {
  const ref = usePica<SpinnerProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
