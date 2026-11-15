"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiScissorLiftProps } from "./core";

export type AsciiScissorLiftComponentProps = Partial<AsciiScissorLiftProps> & WrapperProps;

/** A connected pantograph raises a loaded platform above its wheeled base. */
export function AsciiScissorLift({ className, style, palette, ...props }: AsciiScissorLiftComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
