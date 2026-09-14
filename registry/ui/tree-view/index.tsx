"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TreeViewEvents, type TreeViewProps } from "./core";

export type TreeViewComponentProps = Partial<TreeViewProps> & Handlers<TreeViewEvents> & WrapperProps;

/** A keyboard navigable tree with nested groups, internal expansion, and controlled or uncontrolled selection. */
export function TreeView({ className, style, palette, ...props }: TreeViewComponentProps) {
  const ref = usePica<TreeViewProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
