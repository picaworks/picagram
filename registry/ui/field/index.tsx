"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FieldProps } from "./core";

export type FieldComponentProps = Partial<FieldProps> & WrapperProps & { children?: ReactNode };

/** A label, description, and validation message around a page-owned control. */
export function Field({ className, style, palette, children, ...props }: FieldComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
