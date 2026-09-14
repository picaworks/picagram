"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type InputOtpEvents, type InputOtpProps } from "./core";

export type InputOtpComponentProps = Partial<InputOtpProps> & Handlers<InputOtpEvents> & WrapperProps;

/** A one-time code field with roving focus, paste distribution, and controlled or uncontrolled state. */
export function InputOtp({ className, style, palette, ...props }: InputOtpComponentProps) {
  const ref = usePica<InputOtpProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
