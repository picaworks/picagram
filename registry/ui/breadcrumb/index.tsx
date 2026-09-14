"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type BreadcrumbProps } from "./core";

export type BreadcrumbComponentProps = Partial<BreadcrumbProps> & WrapperProps;

/** A responsive hierarchy trail that keeps the current page distinct and reveals collapsed middle items on demand. */
export function Breadcrumb({ className, style, palette, ...props }: BreadcrumbComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
