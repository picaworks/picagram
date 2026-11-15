"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TerraceWaterworksProps } from "./core";
export type TerraceWaterworksComponentProps=Partial<TerraceWaterworksProps>&WrapperProps;
/** A connected treatment works turns one submerged rake below a fixed service bridge. */
export function TerraceWaterworks({className,style,palette,...props}:TerraceWaterworksComponentProps){
  const ref=usePica(mount,props);
  return <div ref={ref} className={className} style={{width:"100%",height:"100%",...paletteStyle(palette),...style}} />;
}
