import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface FieldProps {
  /** The visible name for the page-owned control. */
  label: string;
  /** Supporting text shown below the control. */
  description: string;
  /** Validation text shown after the description. */
  error: string;
  /** Marks the label as required. */
  required: boolean;
  /** The id of the page-owned control this field labels. */
  controlId: string;
}

export const defaults: FieldProps = {
  label: "Branch name",
  description: "Use a short name that describes the change.",
  error: "",
  required: false,
  controlId: "pica-field-control",
};

/** Layout and type for the chrome the field owns. The page's control keeps its own appearance. */
function fieldRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  return [
    `${selector}{display:grid;grid-template-columns:minmax(0,1fr);align-content:start;gap:0.45em;box-sizing:border-box;width:100%;padding:1em;color:${fg};background:transparent}`,
    `${selector} [data-pica-field-label]{display:flex;align-items:center;gap:0.45em;font:inherit;line-height:1.25}`,
    `${selector} [data-pica-field-required]{font-family:${GRID_FONT};font-size:0.75em;line-height:1;color:${fg}}`,
    `${selector} [data-pica-field-description]{color:${muted};font-size:0.875em;line-height:1.35}`,
    `${selector} [data-pica-field-error]{display:flex;align-items:baseline;gap:0.5em;color:${fg};font-family:${GRID_FONT};font-size:0.875em;line-height:1.35}`,
    `${selector} [data-pica-field-error][hidden],${selector} [data-pica-field-description][hidden],${selector} [data-pica-field-required][hidden]{display:none}`,
    `${selector} [data-pica-field-error-mark]{flex:none;font-weight:700}`,
  ].join("\n");
}

export const mount: Mount<FieldProps> = (host, initial = {}) => {
  let props: FieldProps = { ...defaults, ...initial };
  const sheet = scope(host);

  const label = document.createElement("label");
  label.setAttribute("data-pica", "");
  label.setAttribute("data-pica-field-label", "");

  const labelText = document.createElement("span");
  labelText.setAttribute("data-pica", "");

  const required = document.createElement("span");
  required.setAttribute("data-pica", "");
  required.setAttribute("data-pica-field-required", "");
  required.setAttribute("aria-hidden", "true");
  required.textContent = "■";
  label.append(labelText, required);

  const description = document.createElement("div");
  description.setAttribute("data-pica", "");
  description.setAttribute("data-pica-field-description", "");

  const error = document.createElement("div");
  error.setAttribute("data-pica", "");
  error.setAttribute("data-pica-field-error", "");

  const errorMark = document.createElement("span");
  errorMark.setAttribute("data-pica", "");
  errorMark.setAttribute("data-pica-field-error-mark", "");
  errorMark.setAttribute("aria-hidden", "true");
  errorMark.textContent = "!";

  const errorText = document.createElement("span");
  errorText.setAttribute("data-pica", "");
  error.append(errorMark, errorText);

  host.prepend(label);
  host.append(description, error);

  function render(): void {
    const base = props.controlId || "pica-field-control";
    label.htmlFor = base;
    label.id = `${base}-label`;
    labelText.textContent = props.label;
    required.hidden = !props.required;

    description.id = `${base}-description`;
    description.textContent = props.description;
    description.hidden = !props.description;

    error.id = `${base}-error`;
    errorText.textContent = props.error;
    error.hidden = !props.error;
  }

  sheet.setRules(fieldRules(sheet.selector));
  render();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      render();
    },
    destroy() {
      label.remove();
      description.remove();
      error.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
