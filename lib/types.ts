/** The contract every Pica core implements. See docs/architecture/contract.md. */

/** A mounted component. */
export interface PicaInstance<P> {
  /** Merge new prop values. The core decides what has to be rebuilt. */
  update(props: Partial<P>): void;
  /** Stop all work and remove everything the core added. Safe to call twice. */
  destroy(): void;
}

/** Mounts a core into a host element. Props are plain data: strings, numbers, booleans, null. */
export type Mount<P> = (host: HTMLElement, props?: Partial<P>) => PicaInstance<P>;

/** Props every animated core accepts, so captures and reduced motion behave the same everywhere. */
export interface MotionProps {
  /** Stop animating and hold the current frame. */
  paused: boolean;
  /** Render exactly this animation time, in milliseconds, and do not animate. Null animates. */
  time: number | null;
  /** Seed for every random choice, so the same seed always draws the same frame. */
  seed: number;
}
