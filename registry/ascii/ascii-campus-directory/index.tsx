"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiCampusDirectoryProps } from "./core";
export type AsciiCampusDirectoryComponentProps = Partial<AsciiCampusDirectoryProps> & WrapperProps;
/** A campus guide with a character site map, department selection and accessible visiting directions. */
export function AsciiCampusDirectory({ className, style, palette, ...props }: AsciiCampusDirectoryComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
