"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type WindStationProps } from "./core";
export type WindStationComponentProps=Partial<WindStationProps>&WrapperProps;
/** Three rigid turbine blades turn above a connected utility site. */
export function WindStation({className,style,palette,...props}:WindStationComponentProps){
  const ref=usePica(mount,props);
  return <div ref={ref} className={className} style={{width:"100%",height:"100%",...paletteStyle(palette),...style}} />;
}
