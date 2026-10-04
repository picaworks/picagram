"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CartographicStoryProps } from "./core";
export type CartographicStoryComponentProps = Partial<CartographicStoryProps> & WrapperProps;
/** A narrative map essay with a traced walking route, numbered field captions, a journey essay, and route notes. */
export function CartographicStory({ className, style, palette, ...props }: CartographicStoryComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
