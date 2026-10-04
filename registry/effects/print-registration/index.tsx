"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PrintRegistrationProps } from "./core";

export type PrintRegistrationComponentProps = Partial<PrintRegistrationProps> & WrapperProps & { children?: ReactNode };

/** Registration crosses and a slowly rotating alignment target describe two offset printed layers. */
export function PrintRegistration({ className, style, palette, children, ...props }: PrintRegistrationComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>{children}</div>;
}
