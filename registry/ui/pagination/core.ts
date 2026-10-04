import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface PaginationProps {
  /** The current page. Null lets the component manage its own page. */
  page: number | null;
  /** The initial page when page is null. It is read once when the component mounts. */
  defaultPage: number;
  /** The total number of pages, from 2 to 99. */
  pages: number;
  /** The number of pages kept on each side of the current page, from 0 to 3. */
  siblings: number;
  /** A URL prefix joined to each destination page number. An empty prefix keeps navigation in place. */
  base: string;
  /** The accessible name of the pagination navigation. */
  label: string;
}

export interface PaginationEvents {
  /** A page link was activated. */
  pageChange: number;
}

export const defaults: PaginationProps = {
  page: null,
  defaultPage: 4,
  pages: 9,
  siblings: 1,
  base: "",
  label: "Pages",
};

type PaginationItem = number | "ellipsis";

function paginationRange(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function paginationItems(page: number, pages: number, siblings: number): PaginationItem[] {
  const visible = new Set<number>([1, pages]);
  for (let value = page - siblings; value <= page + siblings; value++) {
    if (value > 1 && value < pages) visible.add(value);
  }
  const ordered = [...visible].sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  for (let index = 0; index < ordered.length; index++) {
    const value = ordered[index];
    const previous = ordered[index - 1];
    if (value === undefined) continue;
    if (previous !== undefined && value - previous > 1) items.push("ellipsis");
    items.push(value);
  }
  return items;
}

function paginationRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `${selector}{display:inline-block;color:${fg}}`,
    `${selector} nav{font-family:${GRID_FONT};font-variant-numeric:tabular-nums}`,
    `${selector} ol{display:flex;align-items:center;gap:.25em;margin:0;padding:0;list-style:none}`,
    `${selector} li{display:flex;margin:0;padding:0}`,
    `${selector} [data-pica-link],${selector} [data-pica-current]{box-sizing:border-box;display:inline-flex;min-inline-size:2.2em;height:2.2em;align-items:center;justify-content:center;padding:0 .55em;border:0;border-bottom:2px solid transparent;border-radius:0;color:${fg};line-height:1;text-decoration:none}`,
    `${selector} [data-pica-link]:hover:not([aria-disabled="true"]){background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} [data-pica-link]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-pica-link][aria-disabled="true"]{opacity:.45;cursor:not-allowed}`,
    `${selector} [data-pica-current]{border-bottom-color:${accent}}`,
    `${selector} [data-pica-ellipsis]{display:inline-flex;height:2.2em;min-inline-size:1.5em;align-items:center;justify-content:center;color:${muted};line-height:1}`,
    `${selector} [data-pica-edge]{gap:.35em}`,
    `@media(max-width:35rem){${selector} ol{gap:.1em}${selector} [data-pica-link],${selector} [data-pica-current]{min-inline-size:2em;padding:0 .35em}${selector} [data-pica-ellipsis]{min-inline-size:1.1em}${selector} [data-pica-word]{display:none}}`,
  ].join("\n");
}

function paginationNode<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  return node;
}

export const mount: Mount<PaginationProps> = (host, initial = {}) => {
  let props: PaginationProps = { ...defaults, ...initial };
  const initialPages = paginationRange(props.pages, 2, 99);
  let current = paginationRange(props.page ?? props.defaultPage, 1, initialPages);
  const emit = emitter<PaginationEvents>(host);
  const sheet = scope(host);
  const nav = paginationNode("nav");
  const list = paginationNode("ol");
  nav.append(list);
  host.append(nav);
  sheet.setRules(paginationRules(sheet.selector));

  function destinationLink(text: string, page: number, name: string, disabled = false, icon = ""): HTMLAnchorElement {
    const link = paginationNode("a");
    link.setAttribute("data-pica-link", "");
    link.setAttribute("data-pica-page", String(page));
    link.href = `${props.base}${page}`;
    link.setAttribute("aria-label", name);
    if (icon) {
      link.setAttribute("data-pica-edge", "");
      const mark = paginationNode("span");
      mark.textContent = icon;
      const word = paginationNode("span");
      word.setAttribute("data-pica-word", "");
      word.textContent = text;
      link.append(mark, word);
    } else {
      link.textContent = text;
    }
    if (disabled) {
      link.setAttribute("aria-disabled", "true");
      link.tabIndex = -1;
    }
    return link;
  }

  function add(node: HTMLElement): void {
    const item = paginationNode("li");
    item.append(node);
    list.append(item);
  }

  function render(): void {
    const pages = paginationRange(props.pages, 2, 99);
    const siblings = paginationRange(props.siblings, 0, 3);
    const shown = paginationRange(props.page ?? current, 1, pages);
    if (props.page === null) current = shown;
    nav.setAttribute("aria-label", props.label);
    list.replaceChildren();
    add(destinationLink("PREV", shown - 1, "Previous page", shown === 1, "←"));
    for (const entry of paginationItems(shown, pages, siblings)) {
      if (entry === "ellipsis") {
        const ellipsis = paginationNode("span");
        ellipsis.setAttribute("data-pica-ellipsis", "");
        ellipsis.setAttribute("aria-hidden", "true");
        ellipsis.textContent = "…";
        add(ellipsis);
      } else if (entry === shown) {
        const figure = paginationNode("span");
        figure.setAttribute("data-pica-current", "");
        figure.setAttribute("data-pica-page", String(entry));
        figure.setAttribute("aria-current", "page");
        figure.setAttribute("aria-label", `Page ${entry}`);
        figure.textContent = String(entry);
        add(figure);
      } else {
        add(destinationLink(String(entry), entry, `Page ${entry}`));
      }
    }
    add(destinationLink("NEXT", shown + 1, "Next page", shown === pages, "→"));
  }

  const onClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-pica-page]") : null;
    if (!target || !nav.contains(target)) return;
    if (target.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      return;
    }
    const nextPage = Number(target.dataset.picaPage);
    emit("pageChange", nextPage);
    if (!props.base) {
      event.preventDefault();
      if (props.page === null) {
        current = nextPage;
        render();
      }
    }
  };
  nav.addEventListener("click", onClick);

  render();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      render();
    },
    destroy() {
      nav.removeEventListener("click", onClick);
      nav.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
