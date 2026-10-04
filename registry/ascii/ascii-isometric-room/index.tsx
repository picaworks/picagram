"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiIsometricRoomProps } from "./core";
export type AsciiIsometricRoomComponentProps = Partial<AsciiIsometricRoomProps> & WrapperProps;
/** A fixed-cell character room elevation with a compact mobile plan, object selection and inventory facts. */
export function AsciiIsometricRoom({ className, style, palette, ...props }: AsciiIsometricRoomComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
