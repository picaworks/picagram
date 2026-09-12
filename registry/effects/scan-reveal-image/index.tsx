"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ScanRevealImageProps } from "./core";

export type ScanRevealImageComponentProps = Partial<ScanRevealImageProps> & WrapperProps;

/** An image a scan bar reveals as it sweeps down, sparse dither ahead of the bar and the finished picture behind it. */
export function ScanRevealImage({ className, style, palette, ...props }: ScanRevealImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
