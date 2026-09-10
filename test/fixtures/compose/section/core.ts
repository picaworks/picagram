import * as child from "../child/core";
import type { Mount } from "../../../../lib/types";

export interface SectionProps {
  /** Label handed to the composed child. */
  label: string;
}

export const defaults: SectionProps = { label: "section" };

/** The same name as the child's helper. */
function helper(text: string): string {
  return `[${text}]`;
}

export const mount: Mount<SectionProps> = (host, initial = {}) => {
  let props: SectionProps = { ...defaults, ...initial };
  const sub = document.createElement("div");
  sub.setAttribute("data-pica", "");
  host.appendChild(sub);
  const childProps: Partial<typeof child.defaults> = { label: helper(props.label) };
  const inner = child.mount(sub, childProps);
  return {
    update(next) {
      props = { ...props, ...next };
      inner.update({ label: helper(props.label) });
    },
    destroy() {
      inner.destroy();
      sub.remove();
    },
  };
};
