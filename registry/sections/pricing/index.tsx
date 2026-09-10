"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PricingEvents, type PricingProps } from "./core";

export type PricingComponentProps = Partial<PricingProps> & Handlers<PricingEvents> & WrapperProps;

/** Pricing tiers with a monthly and yearly switch, each plan a card with its own call to action. */
export function Pricing({ className, style, palette, ...props }: PricingComponentProps) {
  const ref = usePica<PricingProps, HTMLDivElement>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
