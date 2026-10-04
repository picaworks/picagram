"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ConservationReportProps } from "./core";
export type ConservationReportComponentProps = Partial<ConservationReportProps> & WrapperProps;
/** A restoration case study with a condition elevation, paired intervention drawings, an evidence table, and a treatment timeline. */
export function ConservationReport({ className, style, palette, ...props }: ConservationReportComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
