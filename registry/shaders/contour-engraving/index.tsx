"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ContourEngravingProps } from "./core";

export type ContourEngravingComponentProps = Partial<ContourEngravingProps> & WrapperProps;

/** Fine parallel cuts follow a folded plate under slowly shifting directional light. */
export function ContourEngraving({ className, style, palette, ...props }: ContourEngravingComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
