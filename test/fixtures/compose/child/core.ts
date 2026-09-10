import type { Mount } from "../../../../lib/types";

export interface ChildProps {
  /** Text the child writes into its host. */
  label: string;
}

export const defaults: ChildProps = { label: "child" };

/** Shares its name with the section's helper, which the single React file must keep apart. */
function helper(text: string): string {
  return text.toUpperCase();
}

export const mount: Mount<ChildProps> = (host, initial = {}) => {
  let props: ChildProps = { ...defaults, ...initial };
  host.textContent = helper(props.label);
  return {
    update(next) {
      props = { ...props, ...next };
      host.textContent = helper(props.label);
    },
    destroy() {
      host.textContent = "";
    },
  };
};
