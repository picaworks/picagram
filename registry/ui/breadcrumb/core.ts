import { labelHost, unlabelHost } from "../../../lib/a11y";
import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbProps {
  /** The hierarchy to show, with the final item treated as the current page. */
  items: readonly BreadcrumbItem[];
  /** The greatest number of entries shown before the middle is collapsed behind an ellipsis. */
  maxItems: number;
  /** The accessible name of the navigation landmark. An empty label hides the component. */
  label: string;
}

export const defaults: BreadcrumbProps = {
  items: [
    { label: "Home", href: "#" },
    { label: "Catalog", href: "#" },
    { label: "Wave 6", href: "#" },
    { label: "UI", href: "#" },
    { label: "Breadcrumb", href: "#" },
  ],
  maxItems: 4,
  label: "Breadcrumb",
};

function breadcrumbRules(selector: string, hidden: boolean): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `:where(${selector}){box-sizing:border-box;min-height:4.75rem;padding:1rem;display:${hidden ? "none" : "flex"};align-items:center;justify-content:center;color:${fg}}`,
    `${selector} [data-pica-list]{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;margin:0;padding:0;list-style:none}`,
    `${selector} [data-pica-item]{display:inline-flex;align-items:center;min-height:2rem}`,
    `${selector} [data-pica-separator]{margin:0 0.65em;color:${muted};font-family:${GRID_FONT};font-size:0.875em}`,
    `${selector} [data-pica-link]{color:${fg};font:inherit;text-decoration-line:underline;text-decoration-thickness:1px;text-underline-offset:0.22em}`,
    `${selector} [data-pica-link]:hover{color:${accent}}`,
    `${selector} [data-pica-current]{color:${fg}}`,
    `${selector} [data-pica-ellipsis]{appearance:none;margin:0;padding:0.18em 0.55em;border:1px solid ${muted};border-radius:0;background:transparent;color:${muted};font-family:${GRID_FONT};font-size:0.875em;line-height:1.2;cursor:pointer}`,
    `${selector} [data-pica-ellipsis]:hover{background:color-mix(in srgb, ${fg} 10%, transparent);color:${fg}}`,
    `${selector} [data-pica-link]:focus-visible,${selector} [data-pica-ellipsis]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

function breadcrumbElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.setAttribute("data-pica", "");
  return element;
}

export const mount: Mount<BreadcrumbProps> = (host, initial = {}) => {
  let props: BreadcrumbProps = { ...defaults, ...initial };
  let expanded = false;
  const sheet = scope(host);
  const list = breadcrumbElement("ol");
  list.setAttribute("data-pica-list", "");
  host.append(list);

  function appendSeparator(item: HTMLLIElement): void {
    if (list.children.length === 0) return;
    const separator = breadcrumbElement("span");
    separator.setAttribute("data-pica-separator", "");
    separator.setAttribute("aria-hidden", "true");
    separator.textContent = "/";
    item.append(separator);
  }

  function appendItem(index: number): void {
    const entry = props.items[index];
    if (!entry) return;
    const item = breadcrumbElement("li");
    item.setAttribute("data-pica-item", "");
    appendSeparator(item);
    if (index === props.items.length - 1) {
      const current = breadcrumbElement("span");
      current.setAttribute("data-pica-current", "");
      current.setAttribute("aria-current", "page");
      current.textContent = entry.label;
      item.append(current);
    } else {
      const link = breadcrumbElement("a");
      link.setAttribute("data-pica-link", "");
      link.setAttribute("href", entry.href);
      link.textContent = entry.label;
      item.append(link);
    }
    list.append(item);
  }

  function appendEllipsis(): void {
    const item = breadcrumbElement("li");
    item.setAttribute("data-pica-item", "");
    appendSeparator(item);
    const button = breadcrumbElement("button");
    button.setAttribute("data-pica-ellipsis", "");
    button.setAttribute("type", "button");
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute("aria-label", expanded ? "Collapse breadcrumb" : "Show full breadcrumb");
    button.textContent = "…";
    button.addEventListener("click", () => {
      expanded = !expanded;
      draw();
    });
    item.append(button);
    list.append(item);
  }

  function draw(): void {
    labelHost(host, props.label, "navigation");
    sheet.setRules(breadcrumbRules(sheet.selector, !props.label));
    list.replaceChildren();
    const count = props.items.length;
    const limit = Math.max(3, Math.min(8, Math.round(props.maxItems)));
    if (count <= limit) {
      for (let index = 0; index < count; index++) appendItem(index);
      return;
    }
    appendItem(0);
    if (expanded) {
      const tail = count - (limit - 2);
      for (let index = 1; index < tail; index++) appendItem(index);
      appendEllipsis();
      for (let index = tail; index < count; index++) appendItem(index);
    } else {
      appendEllipsis();
      for (let index = count - (limit - 2); index < count; index++) appendItem(index);
    }
  }

  draw();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      list.remove();
      sheet.destroy();
      unlabelHost(host);
      delete host.dataset.picaReady;
    },
  };
};
