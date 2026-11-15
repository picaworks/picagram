"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TwillWeaveProps } from "./core";

export type TwillWeaveComponentProps = Partial<TwillWeaveProps> & WrapperProps;

/** Flat fiber bundles form a finite two over two under twill with gently frayed edges. */
export function TwillWeave({ className, style, palette, ...props }: TwillWeaveComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
