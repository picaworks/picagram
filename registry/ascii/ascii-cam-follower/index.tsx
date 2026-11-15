"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiCamFollowerProps } from "./core";

export type AsciiCamFollowerComponentProps = Partial<AsciiCamFollowerProps> & WrapperProps;

/** A rotating braille cam lifts a guided roller follower against its return spring. */
export function AsciiCamFollower({ className, style, palette, ...props }: AsciiCamFollowerComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
