"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiArchiveTreeProps } from "./core";
export type AsciiArchiveTreeComponentProps = Partial<AsciiArchiveTreeProps> & WrapperProps;
/** An expandable archival finding aid with character branch prefixes and editable collection metadata. */
export function AsciiArchiveTree({ className, style, palette, ...props }: AsciiArchiveTreeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
