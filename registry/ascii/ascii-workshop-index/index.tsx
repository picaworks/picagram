"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiWorkshopIndexProps } from "./core";
export type AsciiWorkshopIndexComponentProps = Partial<AsciiWorkshopIndexProps> & WrapperProps;
/** An open workshop portfolio with character tool studies, a material register, a making sequence and a commission brief. */
export function AsciiWorkshopIndex({ className, style, palette, ...props }: AsciiWorkshopIndexComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
