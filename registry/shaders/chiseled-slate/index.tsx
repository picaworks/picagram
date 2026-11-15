"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ChiseledSlateProps } from "./core";

export type ChiseledSlateComponentProps = Partial<ChiseledSlateProps> & WrapperProps;

/** Recessed tool floors sit beneath light occluding lips on one chipped slate slab. */
export function ChiseledSlate({ className, style, palette, ...props }: ChiseledSlateComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
