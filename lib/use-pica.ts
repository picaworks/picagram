import { useEffect, useRef } from "react";
import type { Mount, PicaInstance } from "./types";

/** Mounts a Pica core into the returned ref and forwards prop changes to it.
 *  Props are plain data by contract, so a JSON key is enough to detect a change. */
export function usePica<P>(mount: Mount<P>, props: Partial<P>) {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<PicaInstance<P> | null>(null);
  const defined = definedProps(props);
  const latest = useRef(defined);
  latest.current = defined;
  const key = JSON.stringify(defined);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const mounted = mount(host, latest.current);
    instance.current = mounted;
    return () => {
      mounted.destroy();
      instance.current = null;
    };
  }, [mount]);

  useEffect(() => {
    instance.current?.update(latest.current);
  }, [key]);

  return ref;
}

/** Drops undefined values, so an unset prop keeps the core's default. */
function definedProps<P>(props: Partial<P>): Partial<P> {
  const out: Partial<P> = {};
  for (const name in props) {
    const value = props[name];
    if (value !== undefined) out[name] = value;
  }
  return out;
}
