"use client";
import type { CSSProperties, ReactNode } from "react";
import { usePica } from "../../../lib/use-pica";
import { mount, type ScanlinesProps } from "./core";

export interface ScanlinesComponentProps extends Partial<ScanlinesProps> {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** A CRT scanline overlay, in the ink color, drawn above whatever content sits inside it. */
export function Scanlines({ className, style, children, ...props }: ScanlinesComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...style }}>
      {children}
    </div>
  );
}
