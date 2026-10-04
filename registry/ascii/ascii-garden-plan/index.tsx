"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiGardenPlanProps, type AsciiGardenPlanEvents } from "./core";

export type AsciiGardenPlanComponentProps = Partial<AsciiGardenPlanProps> & WrapperProps & Handlers<AsciiGardenPlanEvents>;

/** A fixed character planting bed with seasonal layouts, crop spacing records, and practical notes. */
export function AsciiGardenPlan({ className, style, palette, ...props }: AsciiGardenPlanComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
