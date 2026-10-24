"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ChainmailWeaveProps } from "./core";

export type ChainmailWeaveComponentProps = Partial<ChainmailWeaveProps> & WrapperProps;

/** Interlocking curved rings alternate their crossings beneath a single moving light. */
export function ChainmailWeave({ className, style, palette, ...props }: ChainmailWeaveComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
