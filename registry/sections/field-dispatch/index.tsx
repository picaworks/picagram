"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FieldDispatchProps } from "./core";

export type FieldDispatchComponentProps = Partial<FieldDispatchProps> & WrapperProps;

/** A travel dispatch with an original route diagram, dated telegrams and a field notebook. */
export function FieldDispatch({ className, style, palette, ...props }: FieldDispatchComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
