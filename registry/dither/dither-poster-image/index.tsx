"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DitherPosterImageProps } from "./core";

export type DitherPosterImageComponentProps = Partial<DitherPosterImageProps> & WrapperProps;

/** An image posterized into flat tone bands whose step edges dither into a narrow stippled transition. */
export function DitherPosterImage({ className, style, palette, ...props }: DitherPosterImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
