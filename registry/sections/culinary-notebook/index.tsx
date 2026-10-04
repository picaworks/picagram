"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CulinaryNotebookProps } from "./core";

export type CulinaryNotebookComponentProps = Partial<CulinaryNotebookProps> & WrapperProps;

/** A cookbook recipe spread with an original still-life drawing, ingredient weights, timed methods, and practical kitchen notes. */
export function CulinaryNotebook({ className, style, palette, ...props }: CulinaryNotebookComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
