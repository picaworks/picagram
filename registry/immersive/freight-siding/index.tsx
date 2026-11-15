"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type FreightSidingProps } from "./core";
export type FreightSidingComponentProps=Partial<FreightSidingProps>&WrapperProps;
/** A coupled freight train shunts between a canopy and a weighing pad. */
export function FreightSiding({className,style,palette,...props}:FreightSidingComponentProps) {
  const ref=usePica(mount,props);
  return <div ref={ref} className={className} style={{width:"100%",height:"100%",...paletteStyle(palette),...style}} />;
}
