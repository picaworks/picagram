"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PreviewCardEvents, type PreviewCardProps } from "./core";

export type PreviewCardComponentProps = Partial<PreviewCardProps> & Handlers<PreviewCardEvents> & WrapperProps;

/** A link that reveals a small reference preview after a short hover or when focused. */
export function PreviewCard({ className, style, palette, ...props }: PreviewCardComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
