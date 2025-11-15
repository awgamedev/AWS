// ----------------------------------------
// Constants
const SELECTORS = {
  searchInputId: "entitySearch",
  tableBodyId: "entityTableBody",
  tableId: "entityTable",
  sortableHeaderClass: "thead th[data-column]",
  initialSortColumn: "username",
};

// ----------------------------------------
// Main
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById(SELECTORS.searchInputId);
  const tableBody = document.getElementById(SELECTORS.tableBodyId);
  const table = document.getElementById(SELECTORS.tableId);
  if (!table || !tableBody) return;

  const headers = table.querySelectorAll(SELECTORS.sortableHeaderClass);

  let currentSortColumn = null;
  let isAscending = true;

  // Search
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      const term = e.target.value.toLowerCase().trim();
      const rows = tableBody.querySelectorAll("tr");
      // Filter by specific dataset keys to avoid relying on textContent
      filterRowsByTerm(rows, term, ["username", "email", "role"]);
    });
  }

  // Sort events
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

      const rows = tableBody.querySelectorAll("tr");
      const sorted = sortRowsByDataset(rows, column, isAscending);
      sorted.forEach((r) => tableBody.appendChild(r));
      setSortIndicators(headers, header, isAscending);
    });
  });

  // Initial sort
  const initial = table.querySelector(
    `[data-column="${SELECTORS.initialSortColumn}"]`
  );
  if (initial) {
    currentSortColumn = SELECTORS.initialSortColumn;
    isAscending = true;
    const rows = tableBody.querySelectorAll("tr");
    const sorted = sortRowsByDataset(rows, currentSortColumn, isAscending);
    sorted.forEach((r) => tableBody.appendChild(r));
    setSortIndicators(headers, initial, isAscending);
  }
});
