"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PhotocopyImageProps } from "./core";

export type PhotocopyImageComponentProps = Partial<PhotocopyImageProps> & WrapperProps;

/** A photograph pushed through an adaptive threshold into pure ink and ground, with seeded toner specks and streaks. */
export function PhotocopyImage({ className, style, palette, ...props }: PhotocopyImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
