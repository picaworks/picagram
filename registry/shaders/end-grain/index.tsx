"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EndGrainProps } from "./core";

export type EndGrainComponentProps = Partial<EndGrainProps> & WrapperProps;

/** Uneven organic growth rings and medullary rays catch a calm grazing light. */
export function EndGrain({ className, style, palette, ...props }: EndGrainComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
