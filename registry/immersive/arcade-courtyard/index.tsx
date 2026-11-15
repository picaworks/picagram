"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ArcadeCourtyardProps } from "./core";

export type ArcadeCourtyardComponentProps = Partial<ArcadeCourtyardProps> & WrapperProps;

/** A broad open court centers a raised fountain between true stepped arcade openings. */
export function ArcadeCourtyard({ className, style, palette, ...props }: ArcadeCourtyardComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
