import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface TableColumn {
  /** The row object key read by this column. */
  key: string;
  /** The visible column heading. */
  label: string;
  /** The horizontal alignment for the heading and its cells. */
  align?: "left" | "right";
}

export type TableRow = Readonly<Record<string, string | number>>;

export interface TableSort {
  /** The column key used for the initial ordering. */
  key: string;
  /** The initial ordering direction. */
  direction: "asc" | "desc";
}

export interface TableProps {
  /** The keys, labels, and alignment that define the columns. */
  columns: readonly TableColumn[];
  /** The records shown in the table body. */
  rows: readonly TableRow[];
  /** The caption that names the table. */
  label: string;
  /** Lets each column heading cycle the table ordering. */
  sortable: boolean;
  /** The ordering read when the table mounts, or null to preserve row order. */
  defaultSort: TableSort | null;
}

export interface TableEvents {
  /** A heading changed the table ordering. */
  sortChange: { key: string; direction: "asc" | "desc" | null };
}

export const defaults: TableProps = {
  columns: [
    { key: "name", label: "Name" },
    { key: "family", label: "Family" },
    { key: "size", label: "Size KB", align: "right" },
    { key: "checks", label: "Checks", align: "right" },
  ],
  rows: [
    { name: "Quiet Hero", family: "Section", size: 11.6, checks: 24 },
    { name: "Orbit Plot", family: "Data", size: 6.4, checks: 22 },
    { name: "Glyph Atlas", family: "ASCII", size: 5.8, checks: 18 },
    { name: "Signal Button", family: "UI", size: 4.2, checks: 16 },
    { name: "Grid Field", family: "Pattern", size: 3.7, checks: 12 },
  ],
  label: "Components",
  sortable: true,
  defaultSort: { key: "size", direction: "desc" },
};

type ActiveTableSort = { key: string; direction: "asc" | "desc" | null };

function tableElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  return node;
}

function tableCompare(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  const a = String(left).toLowerCase();
  const b = String(right).toLowerCase();
  return a < b ? -1 : a > b ? 1 : 0;
}

function tableRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `:where(${selector}){display:block;width:100%;box-sizing:border-box;padding:clamp(1rem,3vw,2.5rem);color:${fg}}`,
    `${selector} table{width:100%;border-collapse:collapse;border-spacing:0;font-size:clamp(.75rem,1.5vw,1rem);line-height:1.45}`,
    `${selector} caption{text-align:left;padding:0 0 1.1rem;color:${muted};font-family:${GRID_FONT};font-size:.72em;font-weight:600;letter-spacing:.08em;text-transform:uppercase}`,
    `${selector} th,${selector} td{box-sizing:border-box;text-align:left;vertical-align:middle;padding:.85em clamp(.55em,2vw,1.4em) .85em 0}`,
    `${selector} th:last-child,${selector} td:last-child{padding-right:0}`,
    `${selector} th{border-bottom:1px solid color-mix(in srgb,${fg} 34%,transparent);font-size:.82em;font-weight:600;letter-spacing:.025em}`,
    `${selector} tbody tr:not(:last-child) td{border-bottom:1px solid color-mix(in srgb,${fg} 16%,transparent)}`,
    `${selector} tbody tr{height:clamp(4.5rem,9vh,5rem)}`,
    `${selector} [data-align="right"]{text-align:right}`,
    `${selector} td[data-numeric]{font-family:${GRID_FONT};font-variant-numeric:tabular-nums lining-nums}`,
    `${selector} button{appearance:none;display:inline-flex;align-items:center;gap:.55em;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:inherit;font:inherit;letter-spacing:inherit;cursor:pointer}`,
    `${selector} th[data-align="right"] button{margin-left:auto}`,
    `${selector} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-caret]{color:${accent};font-family:${GRID_FONT};font-size:.9em;line-height:1}`,
  ].join("\n");
}

export const mount: Mount<TableProps> = (host, initial = {}) => {
  let props: TableProps = { ...defaults, ...initial };
  let activeSort: ActiveTableSort | null = props.defaultSort ? { ...props.defaultSort } : null;
  const emit = emitter<TableEvents>(host);
  const sheet = scope(host);
  const table = tableElement("table");
  host.append(table);

  function orderedRows(): readonly TableRow[] {
    if (!activeSort?.direction) return props.rows;
    const { key, direction } = activeSort;
    return props.rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const order = tableCompare(a.row[key] ?? "", b.row[key] ?? "");
        return order === 0 ? a.index - b.index : direction === "asc" ? order : -order;
      })
      .map(({ row }) => row);
  }

  function draw(): void {
    if (activeSort && !props.columns.some((column) => column.key === activeSort?.key)) activeSort = null;

    const caption = tableElement("caption");
    caption.textContent = props.label;
    caption.hidden = props.label.length === 0;

    const head = tableElement("thead");
    const headRow = tableElement("tr");
    for (const column of props.columns) {
      const cell = tableElement("th");
      cell.scope = "col";
      cell.dataset.column = column.key;
      cell.dataset.align = column.align ?? "left";
      if (activeSort?.key === column.key && activeSort.direction) {
        cell.setAttribute("aria-sort", activeSort.direction === "asc" ? "ascending" : "descending");
      }
      if (props.sortable) {
        const button = tableElement("button");
        button.type = "button";
        button.dataset.sortKey = column.key;
        const text = tableElement("span");
        text.textContent = column.label;
        button.append(text);
        if (activeSort?.key === column.key && activeSort.direction) {
          const caret = tableElement("span");
          caret.dataset.caret = "";
          caret.setAttribute("aria-hidden", "true");
          caret.textContent = activeSort.direction === "asc" ? "▴" : "▾";
          button.append(caret);
        }
        cell.append(button);
      } else {
        cell.textContent = column.label;
      }
      headRow.append(cell);
    }
    head.append(headRow);

    const body = tableElement("tbody");
    for (const row of orderedRows()) {
      const bodyRow = tableElement("tr");
      for (const column of props.columns) {
        const cell = tableElement("td");
        const value = row[column.key] ?? "";
        cell.dataset.align = column.align ?? "left";
        if (typeof value === "number") cell.dataset.numeric = "";
        cell.textContent = String(value);
        bodyRow.append(cell);
      }
      body.append(bodyRow);
    }

    table.replaceChildren(caption, head, body);
  }

  const onClick = (event: MouseEvent): void => {
    if (!props.sortable || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("button[data-sort-key]");
    if (!button || !table.contains(button)) return;
    const key = button.dataset.sortKey;
    if (!key) return;
    const direction = activeSort?.key !== key ? "asc" : activeSort.direction === "desc" ? "asc" : activeSort.direction === "asc" ? null : "desc";
    activeSort = { key, direction };
    draw();
    emit("sortChange", { key, direction });
  };

  table.addEventListener("click", onClick);
  sheet.setRules(tableRules(sheet.selector));
  draw();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      table.removeEventListener("click", onClick);
      table.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
