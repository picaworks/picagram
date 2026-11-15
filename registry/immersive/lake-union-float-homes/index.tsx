"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LakeUnionFloatHomesProps } from "./core";

export type LakeUnionFloatHomesComponentProps = Partial<LakeUnionFloatHomesProps> & WrapperProps;

/** Connected floating homes follow a quiet swell beside a fixed shore landing. */
export function LakeUnionFloatHomes({ className, style, palette, ...props }: LakeUnionFloatHomesComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
