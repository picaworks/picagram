"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AlertProps } from "./core";

export type AlertComponentProps = Partial<AlertProps> & WrapperProps;

/** A live status callout with a tag, title, and message in four restrained tones. */
export function Alert({ className, style, palette, ...props }: AlertComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
