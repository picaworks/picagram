"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SwitchEvents, type SwitchProps } from "./core";

export type SwitchComponentProps = Partial<SwitchProps> & Handlers<SwitchEvents> & WrapperProps;

/** An accessible on and off switch with a visible label and optional state value. */
export function Switch({ className, style, palette, ...props }: SwitchComponentProps) {
  const ref = usePica<SwitchProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
