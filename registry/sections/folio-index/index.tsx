"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FolioIndexProps } from "./core";

export type FolioIndexComponentProps = Partial<FolioIndexProps> & WrapperProps;

/** A designer portfolio with a numbered project index, project dossiers, and a practice statement. */
export function FolioIndex({ className, style, palette, ...props }: FolioIndexComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
