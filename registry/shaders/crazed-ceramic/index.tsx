"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CrazedCeramicProps } from "./core";

export type CrazedCeramicComponentProps = Partial<CrazedCeramicProps> & WrapperProps;

/** Asymmetric glaze cuts and a continuous ceramic relief bend one slow grazing reflection. */
export function CrazedCeramic({ className, style, palette, ...props }: CrazedCeramicComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
