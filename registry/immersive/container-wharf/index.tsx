"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ContainerWharfProps } from "./core";
export type ContainerWharfComponentProps = Partial<ContainerWharfProps> & WrapperProps;
/** A portal crane carries one container between a barge and a quay. */
export function ContainerWharf({ className, style, palette, ...props }: ContainerWharfComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
