"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SlitScanImageProps } from "./core";

export type SlitScanImageComponentProps = Partial<SlitScanImageProps> & WrapperProps;

/** An image rebuilt column by column from a slit sweeping across it, streaking whatever falls behind. */
export function SlitScanImage({ className, style, palette, ...props }: SlitScanImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
