import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface ContactChannel {
  /** The channel's name, shown as a mono label above its value. */
  label: string;
  /** The text a visitor reads, such as an address or a number. */
  value: string;
  /** Where the value links, such as mailto: or tel:. Without it the value is plain text. */
  href?: string;
}

export interface ContactValues {
  /** The text the name field starts with. */
  name: string;
  /** The address the email field starts with. */
  email: string;
  /** The text the message field starts with. */
  message: string;
}

export interface ContactPanelProps {
  /** The contact details, one row each. A channel with an href links, and one without is plain text. */
  channels: readonly ContactChannel[];
  /** The values the three fields start with, read once at mount. */
  defaultValues: ContactValues;
  /** The accessible name of the form. */
  label: string;
  /** The accessible name of the contact details. */
  detailsLabel: string;
  /** The text on the submit button. */
  buttonLabel: string;
  /** The text announced in the status region after a valid send. */
  confirmation: string;
  /** The mono note beside the button. */
  note: string;
  /** Disables every control and the button, and dims them to 45 percent. */
  disabled: boolean;
}

export type ContactSend = { name: string; email: string; message: string };

export interface ContactPanelEvents {
  /** The visitor submitted a valid form. The detail holds the three field values. */
  send: ContactSend;
}

export const defaults: ContactPanelProps = {
  channels: [
    { label: "Email", value: "hello@example.com", href: "mailto:hello@example.com" },
    { label: "Phone", value: "+1 555 0100", href: "tel:+15550100" },
    { label: "Studio", value: "14 Foundry Lane, Leeds LS1 4AB" },
    { label: "Hours", value: "Monday to Friday, 09:00 to 17:00" },
  ],
  defaultValues: {
    name: "Ada Reader",
    email: "reader@example.com",
    message: "I would like to talk about using these sections in our docs.",
  },
  label: "Contact form",
  detailsLabel: "Contact details",
  buttonLabel: "Send message",
  confirmation: "Thank you. We will reply within two working days.",
  note: "Nothing is sent until your page handles the send event.",
  disabled: false,
};

/** Labels whose plain value is a postal address, which belongs in an address element. */
const ADDRESS_LABEL = /address|studio|office|location|visit|post/i;

/** A link target is kept only when it cannot run script. */
function safeHref(href: string | undefined): string {
  const value = (href ?? "").trim();
  return value && !/^(javascript|data|vbscript):/i.test(value) ? value : "";
}

/** Layout and type for the section. The minimum height goes in a :where() rule, which carries no specificity,
 *  so a page that sizes this host itself wins without fighting an inline style. The two columns are flex
 *  items whose bases are one to two, so they sit side by side when the host is wide and stack when it is not,
 *  with no media query. */
function rules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const hairline = `color-mix(in srgb, ${fg} 30%, transparent)`;
  const tint = `color-mix(in srgb, ${fg} 10%, transparent)`;
  const control = `${selector} [data-pica-control]`;
  return [
    `:where(${selector}){min-height:24rem}`,
    `${selector}{box-sizing:border-box;display:flex;flex-direction:column;padding:clamp(1.5rem, 5vw, 4rem);color:${fg}}`,
    `${selector} > [data-pica-panel]{display:flex;flex-wrap:wrap;align-items:flex-start;gap:clamp(1.75rem, 4vw, 3rem);margin-top:clamp(1.75rem, 4vw, 3rem)}`,
    `${selector} [data-pica-details]{flex:1 1 16rem;min-width:0}`,
    `${selector} [data-pica-form]{flex:2 1 32rem;min-width:0;margin:0}`,
    `${selector} [data-pica-list]{margin:0;padding:0;border-bottom:1px solid ${hairline}}`,
    `${selector} [data-pica-channel]{padding:0.9em 0;border-top:1px solid ${hairline}}`,
    `${selector} [data-pica-term]{margin:0 0 0.35em;color:${muted};font-family:${GRID_FONT};font-size:0.72em;line-height:1.2;letter-spacing:0.04em;text-transform:uppercase}`,
    `${selector} [data-pica-value]{margin:0;color:${fg};font:inherit;font-style:normal;line-height:1.4;overflow-wrap:anywhere}`,
    `${selector} [data-pica-value] address{margin:0;font:inherit;font-style:normal}`,
    `${selector} [data-pica-value] a{color:${fg};text-decoration:underline;text-underline-offset:0.2em;text-decoration-thickness:1px}`,
    `${selector} [data-pica-value] a:hover{background:${tint}}`,
    `${selector} [data-pica-fields]{display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 18rem), 1fr));gap:1.25em}`,
    `${selector} [data-pica-wide]{grid-column:1 / -1}`,
    `${control}{display:grid;gap:0.45em;min-width:0}`,
    `${control}[data-disabled]{opacity:0.45}`,
    `${control} label{color:${fg};font:inherit;font-size:0.9em;line-height:1.25}`,
    `${control} input,${control} textarea{appearance:none;box-sizing:border-box;display:block;width:100%;min-width:0;margin:0;padding:0.7em 0.8em;border:1px solid ${muted};border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1.5;outline:none}`,
    `${control} textarea{min-height:7rem;resize:vertical}`,
    `${control} input:hover,${control} textarea:hover{background:${tint}}`,
    `${control} input:disabled,${control} textarea:disabled{cursor:not-allowed}`,
    `${selector} [data-pica-actions]{display:flex;flex-wrap:wrap;align-items:center;gap:0.75em 1.25em;margin-top:1.5em}`,
    `${selector} [data-pica-submit]{appearance:none;display:inline-flex;align-items:center;margin:0;padding:0.7em 1.4em;border:1px solid ${accent};border-radius:0;background:${accent};color:${cssOn("accent")};font:inherit;line-height:1.2;cursor:pointer}`,
    `${selector} [data-pica-submit]:hover{background:color-mix(in srgb, ${accent}, ${fg} 10%)}`,
    `${selector} [data-pica-submit]:disabled{opacity:0.45;cursor:not-allowed}`,
    `${selector} [data-pica-note]{margin:0;flex:1 1 14rem;color:${muted};font-family:${GRID_FONT};font-size:0.72em;line-height:1.4;letter-spacing:0.04em}`,
    `${selector} [data-pica-status]{margin:0;color:${fg};font:inherit;line-height:1.4}`,
    `${selector} [data-pica-status]:not(:empty){margin-top:1.25em}`,
    `${selector} a:focus-visible,${selector} input:focus-visible,${selector} textarea:focus-visible,${selector} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

/** Creates an element that carries data-pica, with optional extra marker attributes. */
function make<K extends keyof HTMLElementTagNameMap>(tag: K, ...marks: string[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  for (const mark of marks) el.setAttribute(mark, "");
  return el;
}

/** Rebuilds the details list from JSON: a dt label and a dd value per channel, in source order. */
function renderChannels(list: HTMLElement, channels: readonly ContactChannel[]): void {
  list.replaceChildren();
  for (const channel of channels) {
    const row = make("div", "data-pica-channel");
    const term = make("dt", "data-pica-term");
    const value = make("dd", "data-pica-value");
    term.textContent = channel.label;
    const href = safeHref(channel.href);
    if (href) {
      const link = make("a");
      link.href = href;
      link.textContent = channel.value;
      value.append(link);
    } else if (ADDRESS_LABEL.test(channel.label)) {
      const address = make("address");
      address.textContent = channel.value;
      value.append(address);
    } else {
      value.textContent = channel.value;
    }
    row.append(term, value);
    list.append(row);
  }
}

export const mount: Mount<ContactPanelProps> = (host, initial = {}) => {
  let props: ContactPanelProps = { ...defaults, ...initial };
  let sent = false;
  let destroyed = false;
  const emit = emitter<ContactPanelEvents>(host);
  const sheet = scope(host);

  const panel = make("div", "data-pica-panel");
  const details = make("div", "data-pica-details");
  details.setAttribute("role", "group");
  const list = make("dl", "data-pica-list");
  const form = make("form", "data-pica-form");
  form.noValidate = true;
  const fields = make("div", "data-pica-fields");
  const nameInput = make("input");
  const emailInput = make("input");
  const messageInput = make("textarea");
  const submit = make("button", "data-pica-submit");
  const note = make("p", "data-pica-note");
  const actions = make("div", "data-pica-actions");
  const status = make("p", "data-pica-status");

  nameInput.type = "text";
  nameInput.name = "name";
  nameInput.autocomplete = "name";
  emailInput.type = "email";
  emailInput.name = "email";
  emailInput.autocomplete = "email";
  messageInput.name = "message";
  messageInput.rows = 5;
  submit.type = "submit";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const seed = { ...defaults.defaultValues, ...props.defaultValues };
  nameInput.value = seed.name;
  emailInput.value = seed.email;
  messageInput.value = seed.message;

  const inputs = [nameInput, emailInput, messageInput];
  const wraps: HTMLElement[] = [];
  for (const [text, input, wide] of [
    ["Name", nameInput, false],
    ["Email", emailInput, false],
    ["Message", messageInput, true],
  ] as const) {
    const wrap = make("div", "data-pica-control");
    if (wide) wrap.setAttribute("data-pica-wide", "");
    const label = make("label");
    const id = nextId("pica-contact");
    input.id = id;
    input.required = true;
    label.htmlFor = id;
    label.textContent = text;
    wrap.append(label, input);
    fields.append(wrap);
    wraps.push(wrap);
  }

  actions.append(submit, note);
  form.append(fields, actions, status);
  details.append(list);
  panel.append(details, form);
  host.append(panel);

  const onSubmit = (event: Event): void => {
    event.preventDefault();
    if (props.disabled) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    sent = true;
    status.textContent = props.confirmation;
    emit("send", { name: nameInput.value, email: emailInput.value, message: messageInput.value });
  };
  form.addEventListener("submit", onSubmit);

  function setDisabled(): void {
    for (const input of inputs) input.disabled = props.disabled;
    submit.disabled = props.disabled;
    for (const wrap of wraps) wrap.toggleAttribute("data-disabled", props.disabled);
  }

  renderChannels(list, props.channels);
  details.setAttribute("aria-label", props.detailsLabel);
  form.setAttribute("aria-label", props.label);
  submit.textContent = props.buttonLabel;
  note.textContent = props.note;
  setDisabled();
  sheet.setRules(rules(sheet.selector));
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before.channels, props.channels)) renderChannels(list, props.channels);
      if (props.detailsLabel !== before.detailsLabel) details.setAttribute("aria-label", props.detailsLabel);
      if (props.label !== before.label) form.setAttribute("aria-label", props.label);
      if (props.buttonLabel !== before.buttonLabel) submit.textContent = props.buttonLabel;
      if (props.note !== before.note) note.textContent = props.note;
      if (sent && props.confirmation !== before.confirmation) status.textContent = props.confirmation;
      if (props.disabled !== before.disabled) setDisabled();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      form.removeEventListener("submit", onSubmit);
      panel.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
