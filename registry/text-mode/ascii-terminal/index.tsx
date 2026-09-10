"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiTerminalProps } from "./core";

export interface AsciiTerminalComponentProps extends Partial<AsciiTerminalProps> {
  className?: string;
  style?: CSSProperties;
}

/** A terminal transcript that types its command, prints its output, and rests on a blinking cursor. */
export function AsciiTerminal({ className, style, ...props }: AsciiTerminalComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
