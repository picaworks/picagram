"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PopoverTooltipEvents, type PopoverTooltipProps } from "./core";

export type PopoverTooltipComponentProps = Partial<PopoverTooltipProps> & Handlers<PopoverTooltipEvents> & WrapperProps;

/** A trigger button that shows a tooltip on hover and focus, or toggles a popover panel on click, built on the Popover API. */
export function PopoverTooltip({ className, style, palette, ...props }: PopoverTooltipComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ display: "inline-block", ...paletteStyle(palette), ...style }} />;
}
