"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EngravedReliefImageProps } from "./core";

export type EngravedReliefImageComponentProps = Partial<EngravedReliefImageProps> & WrapperProps;

/** An image carved into a monochrome relief, revealed by a slowly rotating grazing light. */
export function EngravedReliefImage({ className, style, palette, ...props }: EngravedReliefImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
