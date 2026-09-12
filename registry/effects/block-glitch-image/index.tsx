"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BlockGlitchImageProps } from "./core";

export type BlockGlitchImageComponentProps = Partial<BlockGlitchImageProps> & WrapperProps;

/** A photograph that sits still, then for a moment shows rectangular blocks copied in from the wrong place. */
export function BlockGlitchImage({ className, style, palette, ...props }: BlockGlitchImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
