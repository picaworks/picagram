"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ObservatoryBulletinProps } from "./core";
export type ObservatoryBulletinComponentProps = Partial<ObservatoryBulletinProps> & WrapperProps;
/** An astronomical field bulletin with an original sky diagram, observing table, equipment notes, and a log disclosure. */
export function ObservatoryBulletin({ className, style, palette, ...props }: ObservatoryBulletinComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
