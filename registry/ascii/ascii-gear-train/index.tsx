"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiGearTrainProps } from "./core";

export type AsciiGearTrainComponentProps = Partial<AsciiGearTrainProps> & WrapperProps;

/** Three toothed braille gears turn together around fixed hub bearings. */
export function AsciiGearTrain({ className, style, palette, ...props }: AsciiGearTrainComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
