"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ScrollAreaProps } from "./core";

export type ScrollAreaComponentProps = Partial<ScrollAreaProps> & WrapperProps & { children?: ReactNode };

/** A native scroll container with quiet edge and position indicators. */
export function ScrollArea({ className, style, palette, children, ...props }: ScrollAreaComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
