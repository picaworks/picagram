"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type RotaryAssemblyProps } from "./core";
export type RotaryAssemblyComponentProps=Partial<RotaryAssemblyProps>&WrapperProps;
/** Four attached workpieces index beneath a fixed assembly press. */
export function RotaryAssembly({className,style,palette,...props}:RotaryAssemblyComponentProps){
  const ref=usePica(mount,props);
  return <div ref={ref} className={className} style={{width:"100%",height:"100%",...paletteStyle(palette),...style}} />;
}
