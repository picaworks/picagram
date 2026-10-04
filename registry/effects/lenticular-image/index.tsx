"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LenticularImageProps } from "./core";

export type LenticularImageComponentProps = Partial<LenticularImageProps> & WrapperProps;

/** Two registered images revealed through parallel lenticular strips by viewing position. */
export function LenticularImage({ className, style, palette, ...props }: LenticularImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
