"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MenuEvents, type MenuProps } from "./core";

export type MenuComponentProps = Partial<MenuProps> & Handlers<MenuEvents> & WrapperProps;

/** A button that opens a keyboard navigable menu of actions. */
export function Menu({ className, style, palette, ...props }: MenuComponentProps) {
  const ref = usePica<MenuProps, HTMLButtonElement>(mount, props);
  return <button ref={ref} type="button" className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
