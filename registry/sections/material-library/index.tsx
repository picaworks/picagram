"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MaterialLibraryProps } from "./core";

export type MaterialLibraryComponentProps = Partial<MaterialLibraryProps> & WrapperProps;

/** An architectural sample register with original surface patterns, a specification ledger, and repair-minded selection criteria. */
export function MaterialLibrary({ className, style, palette, ...props }: MaterialLibraryComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
