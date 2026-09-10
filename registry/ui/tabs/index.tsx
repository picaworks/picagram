"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TabsEvents, type TabsProps } from "./core";

export type TabsComponentProps = Partial<TabsProps> & Handlers<TabsEvents> & WrapperProps & { children?: ReactNode };

/** Tabs built from a tabs prop, with the active tab following focus and each direct child treated as a panel. */
export function Tabs({ className, style, palette, children, ...props }: TabsComponentProps) {
  const ref = usePica<TabsProps>(mount, props);
  return (
    <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
