"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EtchedRadialProps } from "./core";

export type EtchedRadialComponentProps = Partial<EtchedRadialProps> & WrapperProps;

/** Concentric machining grooves catch a slow anisotropic highlight around an offset center. */
export function EtchedRadial({ className, style, palette, ...props }: EtchedRadialComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
