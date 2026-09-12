"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BulletChartProps } from "./core";

export type BulletChartComponentProps = Partial<BulletChartProps> & WrapperProps;

/** Rows showing measures as bars over muted bands, with targets marked as ticks. */
export function BulletChart({ className, style, palette, ...props }: BulletChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
