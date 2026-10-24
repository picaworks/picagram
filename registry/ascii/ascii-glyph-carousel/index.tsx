"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiGlyphCarouselProps } from "./core";

export type AsciiGlyphCarouselComponentProps = Partial<AsciiGlyphCarouselProps> & WrapperProps;

/** Upright word panels travel around a slow carousel in perspective. */
export function AsciiGlyphCarousel({ className, style, palette, ...props }: AsciiGlyphCarouselComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
