"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RidgeCablewayProps } from "./core";
export type RidgeCablewayComponentProps=Partial<RidgeCablewayProps>&WrapperProps;
/** One upright cabin travels beneath a continuous hillside haul cable. */
export function RidgeCableway({className,style,palette,...props}:RidgeCablewayComponentProps){
  const ref=usePica(mount,props);
  return <div ref={ref} className={className} style={{width:"100%",height:"100%",...paletteStyle(palette),...style}} />;
}
