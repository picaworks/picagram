"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiLinkageRosetteProps } from "./core";

export type AsciiLinkageRosetteComponentProps = Partial<AsciiLinkageRosetteProps> & WrapperProps;

/** Hinged diamond chains open together around a stationary central hub. */
export function AsciiLinkageRosette({ className, style, palette, ...props }: AsciiLinkageRosetteComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
