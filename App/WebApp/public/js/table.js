// Datei: public/js/userList.js
// Zweck: Such- und Sortierlogik für die User-Tabelle
// ----------------------------------------
// Konstanten
const SELECTORS = {
  searchInputId: "userSearch",
  tableBodyId: "userTableBody",
  tableId: "userTable",
  sortableHeaderClass: ".sortable",
  initialSortColumn: "username",
};

// ----------------------------------------
// Utility-Funktionen (bei Wiederverwendung auslagern in utilities/table-utils.js)

/**
 * Filtert Tabellenzeilen anhand eines Suchbegriffs.
 * @param {NodeList|HTMLElement[]} rows
 * @param {string} term lowercase Suchbegriff
 */
const filterUserRows = (rows, term) => {
  rows.forEach((row) => {
    const rowText = `${row.dataset.username || ""} ${row.dataset.email || ""} ${
      row.dataset.role || ""
    }`.toLowerCase();
    row.style.display = rowText.includes(term) ? "" : "none";
  });
};

/**
 * Sortiert Zeilen nach einer Dataset-Spalte.
 * @param {HTMLElement[]} rows
 * @param {string} column dataset key (z.B. 'username')
 * @param {boolean} ascending
 * @returns {HTMLElement[]}
 */
const sortUserRows = (rows, column, ascending) => {
  return rows.sort((a, b) => {
    const aVal = (a.dataset[column] || "").toLowerCase();
    const bVal = (b.dataset[column] || "").toLowerCase();
    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
};

/**
 * Aktualisiert Sortierindikatoren.
 * @param {NodeList|HTMLElement[]} headers
 * @param {HTMLElement} active
 * @param {boolean} asc
 */
const updateSortIndicators = (headers, active, asc) => {
  headers.forEach((h) => h.classList.remove("sort-asc", "sort-desc"));
  active.classList.add(asc ? "sort-asc" : "sort-desc");
};

// ----------------------------------------
// Hauptcode
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById(SELECTORS.searchInputId);
  const tableBody = document.getElementById(SELECTORS.tableBodyId);
  const table = document.getElementById(SELECTORS.tableId);
  if (!table || !tableBody) return;

  const headers = table.querySelectorAll(SELECTORS.sortableHeaderClass);

  let currentSortColumn = null;
  let isAscending = true;

  // Suche
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      const term = e.target.value.toLowerCase().trim();
      const rows = tableBody.querySelectorAll("tr");
      filterUserRows(rows, term);
    });
  }

  // Sortier-Events
  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const column = header.dataset.column;
      if (!column) return;

      if (currentSortColumn === column) {
        isAscending = !isAscending;
      } else {
        currentSortColumn = column;
        isAscending = true;
      }

      const rows = Array.from(tableBody.querySelectorAll("tr"));
      const sorted = sortUserRows(rows, column, isAscending);
      sorted.forEach((r) => tableBody.appendChild(r));
      updateSortIndicators(headers, header, isAscending);
    });
  });

  // Initiale Sortierung
  const initial = table.querySelector(
    `[data-column="${SELECTORS.initialSortColumn}"]`
  );
  if (initial) {
    currentSortColumn = SELECTORS.initialSortColumn;
    isAscending = true;
    const rows = Array.from(tableBody.querySelectorAll("tr"));
    const sorted = sortUserRows(rows, currentSortColumn, isAscending);
    sorted.forEach((r) => tableBody.appendChild(r));
    updateSortIndicators(headers, initial, isAscending);
  }
});
