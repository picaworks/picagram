"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type LetterpressBroadsideProps } from "./core";
export type LetterpressBroadsideComponentProps = Partial<LetterpressBroadsideProps> & WrapperProps;
/** A public announcement composed as a typographic broadside with meeting details, an agenda, and print marks. */
export function LetterpressBroadside({ className, style, palette, ...props }: LetterpressBroadsideComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
