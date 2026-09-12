"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RisographImageProps } from "./core";

export type RisographImageComponentProps = Partial<RisographImageProps> & WrapperProps;

/** A photograph printed as two risograph passes, fg for the shadows and accent for the midtones, each
 *  screened and offset so their edges show a printed fringe. */
export function RisographImage({ className, style, palette, ...props }: RisographImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
