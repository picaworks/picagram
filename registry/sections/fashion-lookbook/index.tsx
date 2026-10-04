"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FashionLookbookProps } from "./core";

export type FashionLookbookComponentProps = Partial<FashionLookbookProps> & WrapperProps;

/** An atelier collection presented through asymmetric folio spreads, original garment silhouettes, and technical drawings. */
export function FashionLookbook({ className, style, palette, ...props }: FashionLookbookComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
