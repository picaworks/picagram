"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AccordionEvents, type AccordionProps } from "./core";

export type AccordionComponentProps = Partial<AccordionProps> & Handlers<AccordionEvents> & WrapperProps & { children?: ReactNode };

/** A keyboard navigable set of labeled panels that can open one at a time or independently. */
export function Accordion({ className, style, palette, children, ...props }: AccordionComponentProps) {
  const ref = usePica<AccordionProps>(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
