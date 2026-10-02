"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ContactPanelEvents, type ContactPanelProps } from "./core";

export type ContactPanelComponentProps = Partial<ContactPanelProps> & Handlers<ContactPanelEvents> & WrapperProps & { children?: ReactNode };

/** A page section that adds a contact details list and a short message form below a heading and copy. */
export function ContactPanel({ className, style, palette, children, ...props }: ContactPanelComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
