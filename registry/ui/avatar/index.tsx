"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AvatarProps } from "./core";

export type AvatarComponentProps = Partial<AvatarProps> & WrapperProps;

/** A square hairline avatar that keeps centered mono initials in place until its image is ready. */
export function Avatar({ className, style, palette, ...props }: AvatarComponentProps) {
  const ref = usePica<AvatarProps, HTMLSpanElement>(mount, props);
  return <span ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
