"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CheckboxEvents, type CheckboxProps } from "./core";

export type CheckboxComponentProps = Partial<CheckboxProps> & Handlers<CheckboxEvents> & WrapperProps;

/** A checkbox with checked, unchecked, and mixed states. */
export function Checkbox({ className, style, palette, ...props }: CheckboxComponentProps) {
  const ref = usePica<CheckboxProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
