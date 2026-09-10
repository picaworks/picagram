"use client";
import type { CSSProperties } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiTopoProps } from "./core";

export interface AsciiTopoComponentProps extends Partial<AsciiTopoProps> {
  className?: string;
  style?: CSSProperties;
}

/** Contour lines of a slowly drifting noise field, drawn as directional line glyphs. */
export function AsciiTopo({ className, style, ...props }: AsciiTopoComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }} />;
}
