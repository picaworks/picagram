"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CanalLockProps } from "./core";
export type CanalLockComponentProps=Partial<CanalLockProps>&WrapperProps;
/** A moored canal boat rises and falls inside a closed lock chamber. */
export function CanalLock({className,style,palette,...props}:CanalLockComponentProps){
  const ref=usePica(mount,props);
  return <div ref={ref} className={className} style={{width:"100%",height:"100%",...paletteStyle(palette),...style}} />;
}
