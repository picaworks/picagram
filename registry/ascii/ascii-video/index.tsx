"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiVideoProps } from "./core";

export type AsciiVideoComponentProps = Partial<AsciiVideoProps> & WrapperProps;

/** A video or webcam feed drawn as a live grid of glyphs, the moving counterpart to AsciiImage. */
export function AsciiVideo({ className, style, palette, ...props }: AsciiVideoComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
