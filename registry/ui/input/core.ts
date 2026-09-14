import { labelHost, unlabelHost } from "../../../lib/a11y";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface InputProps {
  /** The displayed value. Null leaves the field uncontrolled. */
  value: string | null;
  /** The initial value when the field is uncontrolled. It is read only when mounted. */
  defaultValue: string;
  /** The kind of text the field accepts. */
  type: "text" | "email" | "password" | "search" | "url";
  /** The hint shown while the field is empty. */
  placeholder: string;
  /** The accessible name announced for the field. */
  label: string;
  /** Blocks editing and dims the field. */
  disabled: boolean;
}

export interface InputEvents {
  /** The complete field value after a user edit. */
  valueChange: string;
  /** The complete field value when the user presses Enter. */
  enter: string;
}

export const defaults: InputProps = {
  value: null,
  defaultValue: "",
  type: "text",
  placeholder: "Search components",
  label: "Search",
  disabled: false,
};

/** Scoped rules for the native input owned by one host. */
function inputRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const field = `${selector}>input[data-pica]`;
  return [
    `${selector}{max-width:calc(100vw - 2em)}`,
    `${field}{appearance:none;box-sizing:border-box;width:22em;max-width:100%;margin:0;padding:0.55em 0.75em;border:1px solid ${fg};border-radius:0;outline:none;box-shadow:none;background:transparent;color:${fg};caret-color:${fg};font-family:${GRID_FONT};font-size:1em;line-height:1.2}`,
    `${field}::placeholder{color:${muted};opacity:1}`,
    `${field}:hover:not(:disabled){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${field}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${field}:disabled{opacity:0.45;cursor:not-allowed}`,
  ].join("\n");
}

export const mount: Mount<InputProps> = (host, initial = {}) => {
  let props: InputProps = { ...defaults, ...initial };
  const emit = emitter<InputEvents>(host);
  const sheet = scope(host);
  const input = document.createElement("input");
  input.setAttribute("data-pica", "");
  input.value = props.value ?? props.defaultValue;

  const onInput = (): void => {
    const value = input.value;
    emit("valueChange", value);
    if (props.value !== null) input.value = props.value;
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") emit("enter", input.value);
  };
  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeyDown);
  host.append(input);

  function apply(): void {
    labelHost(host, props.label, "group");
    input.type = props.type;
    input.placeholder = props.placeholder;
    input.disabled = props.disabled;
    input.setAttribute("aria-label", props.label);
    if (props.value !== null && input.value !== props.value) input.value = props.value;
  }

  sheet.setRules(inputRules(sheet.selector));
  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeyDown);
      input.remove();
      sheet.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
