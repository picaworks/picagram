"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PhotoContactSheetProps } from "./core";

export type PhotoContactSheetComponentProps = Partial<PhotoContactSheetProps> & WrapperProps;

/** A photography collection with original tonal plates, a numbered contact sheet, and selectable frame commentary. */
export function PhotoContactSheet({ className, style, palette, ...props }: PhotoContactSheetComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
