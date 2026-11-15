"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiLiftBridgeProps } from "./core";

export type AsciiLiftBridgeComponentProps = Partial<AsciiLiftBridgeProps> & WrapperProps;

/** Two connected bridge leaves pivot above a quiet channel between fixed towers. */
export function AsciiLiftBridge({ className, style, palette, ...props }: AsciiLiftBridgeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
