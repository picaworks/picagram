import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface EmptyStateAction {
  /** The text shown in the action. */
  label: string;
  /** The destination opened by the action. */
  href: string;
}

export interface EmptyStateProps {
  /** The box drawn figure shown above the title. */
  mark: "tray" | "magnifier" | "orbit";
  /** The primary empty state message. */
  title: string;
  /** The supporting text shown below the title. */
  message: string;
  /** The optional link shown below the message. */
  action: EmptyStateAction | null;
}

export const defaults: EmptyStateProps = {
  mark: "tray",
  title: "Nothing here yet",
  message: "Components you add will show up in this list.",
  action: { label: "Add a component", href: "#" },
};

const MARKS: Readonly<Record<EmptyStateProps["mark"], string>> = {
  tray: "╲         ╱\n ├───────┤ \n └───────┘ ",
  magnifier: " ┌───┐   \n │   │   \n └───┘╲  \n       ╲ ",
  orbit: "    ┌─┐    \n╶───┤ │───╴\n    └─┘    ",
};

function emptyStateRules(selector: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  return [
    `:where(${selector}){box-sizing:border-box;min-height:clamp(19rem,52vh,28rem);display:flex;align-items:center;justify-content:center;padding:clamp(3rem,9vw,5.5rem) 1.5rem;color:${fg}}`,
    `${selector} [data-part="body"]{width:min(100%,34rem);display:flex;flex-direction:column;align-items:center;text-align:center}`,
    `${selector} [data-part="mark"]{margin:0 0 1.35rem;color:${muted};font-family:${GRID_FONT};font-size:clamp(.72rem,1.7vw,.9rem);font-weight:400;line-height:1.05;white-space:pre}`,
    `${selector} [data-part="title"]{font:inherit;font-size:clamp(1.25rem,3vw,1.75rem);font-weight:600;line-height:1.15;letter-spacing:-.015em}`,
    `${selector} [data-part="message"]{max-width:30rem;margin:.65rem 0 0;color:${muted};font:inherit;font-size:.95rem;line-height:1.55}`,
    `${selector} [data-part="title"]:empty,${selector} [data-part="message"]:empty{display:none}`,
    `${selector} [data-part="action"]{box-sizing:border-box;margin-top:1.55rem;padding:.65em .9em .8em;display:inline-flex;color:${fg};background:transparent;border:1px solid color-mix(in srgb, ${fg} 38%, transparent);border-radius:0;font:inherit;font-size:.875rem;line-height:1.2;text-decoration:none}`,
    `${selector} [data-part="action-label"]{position:relative;padding-bottom:.35em}`,
    `${selector} [data-part="action-label"]::after{content:"";position:absolute;height:2px;left:0;right:0;bottom:0;background:${accent}}`,
    `${selector} [data-part="action"]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} [data-part="action"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

function emptyStateNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", part);
  return node;
}

export const mount: Mount<EmptyStateProps> = (host, initial = {}) => {
  let props: EmptyStateProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const body = emptyStateNode("div", "body");
  const mark = emptyStateNode("pre", "mark");
  const title = emptyStateNode("div", "title");
  const message = emptyStateNode("p", "message");
  const action = emptyStateNode("a", "action");
  const actionLabel = emptyStateNode("span", "action-label");
  const titleId = nextId("pica-empty-title");
  const messageId = nextId("pica-empty-message");

  mark.setAttribute("aria-hidden", "true");
  title.id = titleId;
  message.id = messageId;
  action.append(actionLabel);
  body.append(mark, title, message);
  host.append(body);
  sheet.setRules(emptyStateRules(sheet.selector));

  function apply(): void {
    mark.textContent = MARKS[props.mark];
    title.textContent = props.title;
    message.textContent = props.message;
    attrs.set("role", "group");
    attrs.set("aria-labelledby", props.title ? titleId : null);
    attrs.set("aria-describedby", props.message ? messageId : null);
    attrs.set("aria-label", props.title ? null : props.action?.label || props.message || "Empty state");

    if (props.action) {
      action.href = props.action.href;
      actionLabel.textContent = props.action.label;
      if (!action.isConnected) body.append(action);
    } else {
      action.remove();
    }
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      body.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
