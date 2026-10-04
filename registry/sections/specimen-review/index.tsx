"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SpecimenReviewProps } from "./core";

export type SpecimenReviewComponentProps = Partial<SpecimenReviewProps> & WrapperProps;

/** A science and culture review with an original specimen drawing, comparison table and numbered annotations. */
export function SpecimenReview({ className, style, palette, ...props }: SpecimenReviewComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
