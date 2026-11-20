import { ComponentType, ComponentInstance } from "../../lib/component.js";

/**
 * Stacked-card labels and accessibility wiring for the Responsive Table.
 *
 * Works on both markups:
 * - Canvas/props: <div> rows from the responsive-table-row component. Rows
 *   don't know their column headers, so this copies each header onto its
 *   column's cells as `data-label` (used by the stacked layout's ::before).
 *   A MutationObserver relabels rows added or edited later, e.g. in Canvas.
 * - Slot: a real <table>. Also adds explicit ARIA roles in stack mode (which
 *   `display: block` strips in some browsers) and names the scroll region
 *   after the table's <caption>.
 *
 * Existing data-label/role attributes are never overwritten.
 */
class ResponsiveTable extends ComponentInstance {
  init() {
    // Slotted Views output may wrap its <table> in extra markup.
    this.table = this.el.querySelector(".responsive-table") ?? this.el.querySelector("table");
    if (!this.table) {
      return;
    }
    this.isNativeTable = this.table.tagName === "TABLE";

    if (this.isNativeTable && this.el.classList.contains("responsive-table--scroll")) {
      this.labelRegion();
    }

    if (this.el.classList.contains("responsive-table--stack")) {
      this.enhance();
      this.observer = new MutationObserver(() => this.enhance());
      this.observer.observe(this.table, { childList: true, subtree: true });
    }
  }

  remove() {
    this.observer?.disconnect();
  }

  enhance() {
    // Our own attribute changes don't trigger the observer (childList only).
    this.addCellLabels();
    if (this.isNativeTable) {
      this.addRoles();
    }
  }

  labelRegion() {
    const caption = this.table.querySelector("caption");
    if (!caption || this.el.hasAttribute("aria-labelledby")) {
      return;
    }
    if (!caption.id) {
      caption.id = `responsive-table-caption-${Math.random().toString(36).slice(2, 9)}`;
    }
    this.el.setAttribute("aria-labelledby", caption.id);
    this.el.removeAttribute("aria-label");
  }

  // Returns { headerCells, bodyRows, cellsOf(row) } for either markup.
  getStructure() {
    if (this.isNativeTable) {
      const headerRows = this.table.tHead?.rows ?? [];
      return {
        headerCells: headerRows.length ? Array.from(headerRows[headerRows.length - 1].cells) : [],
        bodyRows: Array.from(this.table.tBodies).flatMap((tbody) => Array.from(tbody.rows)),
        cellsOf: (row) => Array.from(row.cells),
      };
    }
    return {
      headerCells: Array.from(this.table.querySelectorAll(".responsive-table__head .responsive-table__cell")),
      bodyRows: Array.from(this.table.querySelectorAll(".responsive-table__body .responsive-table__row")),
      cellsOf: (row) => Array.from(row.querySelectorAll(":scope > .responsive-table__cell")),
    };
  }

  // Column labels expanded across colspans.
  addCellLabels() {
    const { headerCells, bodyRows, cellsOf } = this.getStructure();
    const labels = headerCells.flatMap((cell) => Array(cell.colSpan || 1).fill(cell.textContent.trim()));
    if (!labels.length) {
      return;
    }
    bodyRows.forEach((row) => {
      let column = 0;
      cellsOf(row).forEach((cell) => {
        if (!cell.hasAttribute("data-label")) {
          cell.setAttribute("data-label", labels[column] ?? "");
        }
        column += cell.colSpan || 1;
      });
    });
  }

  addRoles() {
    const setRole = (el, role) => {
      if (!el.hasAttribute("role")) {
        el.setAttribute("role", role);
      }
    };

    setRole(this.table, "table");
    this.table.querySelectorAll("thead, tbody, tfoot").forEach((group) => setRole(group, "rowgroup"));
    this.table.querySelectorAll("tr").forEach((row) => setRole(row, "row"));
    this.table.querySelectorAll("th").forEach((th) => {
      const isRowHeader = th.getAttribute("scope") === "row" || !th.closest("thead");
      setRole(th, isRowHeader ? "rowheader" : "columnheader");
    });
    this.table.querySelectorAll("td").forEach((td) => setRole(td, "cell"));
  }
}

new ComponentType(ResponsiveTable, "responsiveTable", ".responsive-table-wrapper");
