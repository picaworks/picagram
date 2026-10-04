"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PolarExpeditionProps, type PolarExpeditionEvents } from "./core";
export type PolarExpeditionComponentProps = Partial<PolarExpeditionProps> & WrapperProps & Handlers<PolarExpeditionEvents>;
/** A polar field notebook with a route topology, specimen annotations, dispatches, and expedition details. */
export function PolarExpedition({ className, style, palette, ...props }: PolarExpeditionComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
