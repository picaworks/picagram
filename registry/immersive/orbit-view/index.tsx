"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type OrbitViewProps } from "./core";

export type OrbitViewComponentProps = Partial<OrbitViewProps> & WrapperProps;

/** The Earth's limb seen from orbit: dotted land below a curved horizon and a stepped dithered atmosphere. */
export function OrbitView({ className, style, palette, ...props }: OrbitViewComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
