"use client";
import type { CSSProperties, ReactNode } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type AsciiFrameProps } from "./core";

export interface AsciiFrameComponentProps extends Partial<AsciiFrameProps> {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** A container framed in box-drawing characters, with an optional title set into the top rule. */
export function AsciiFrame({ className, style, children, ...props }: AsciiFrameComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }}>
      {children}
    </div>
  );
}
