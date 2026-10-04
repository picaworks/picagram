"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MonographSpreadProps } from "./core";
export type MonographSpreadComponentProps = Partial<MonographSpreadProps> & WrapperProps;
/** An artist monograph with facing pages, geometric studies, marginal captions, and an essay with chapter navigation. */
export function MonographSpread({ className, style, palette, ...props }: MonographSpreadComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
