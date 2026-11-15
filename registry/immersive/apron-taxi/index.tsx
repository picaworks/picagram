"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ApronTaxiProps } from "./core";

export type ApronTaxiComponentProps = Partial<ApronTaxiProps> & WrapperProps;

/** A small airplane taxis around an isometric airfield. */
export function ApronTaxi({ className, style, palette, ...props }: ApronTaxiComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
