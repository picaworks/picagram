"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PerforatedScreenProps } from "./core";

export type PerforatedScreenComponentProps = Partial<PerforatedScreenProps> & WrapperProps;

/** Staggered round holes reveal a lower plane through a shallow metal screen. */
export function PerforatedScreen({ className, style, palette, ...props }: PerforatedScreenComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
