"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TriangularMeshProps } from "./core";

export type TriangularMeshComponentProps = Partial<TriangularMeshProps> & WrapperProps & { children?: ReactNode };

/** An irregular triangulated wireframe with a dot at every node, drawn quietly behind page content. */
export function TriangularMesh({ className, style, palette, children, ...props }: TriangularMeshComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
