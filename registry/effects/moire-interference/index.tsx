"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MoireInterferenceProps } from "./core";

export type MoireInterferenceComponentProps = Partial<MoireInterferenceProps> & WrapperProps & { children?: ReactNode };

/** Two sparse line screens create broad slowly drifting interference bands at the page edges. */
export function MoireInterference({ className, style, palette, children, ...props }: MoireInterferenceComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
