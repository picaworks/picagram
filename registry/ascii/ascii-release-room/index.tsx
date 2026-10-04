"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiReleaseRoomProps } from "./core";
export type AsciiReleaseRoomComponentProps = Partial<AsciiReleaseRoomProps> & WrapperProps;
/** A software release page with a character branch graph, version selection and compatibility notes. */
export function AsciiReleaseRoom({ className, style, palette, ...props }: AsciiReleaseRoomComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
