// File: public/js/utilities/table-utils.js
// Purpose: Reusable helpers for filtering, sorting, and indicating sort state in tables
// -------------------------------

/**
 * Filters table rows by a lowercase search term using dataset keys.
 * If datasetKeys is empty, falls back to row.textContent.
 * @param {NodeList|HTMLElement[]} rows
 * @param {string} term - lowercase search term
 * @param {string[]} datasetKeys - list of dataset keys to search (e.g., ['username', 'email'])
 */
const filterRowsByTerm = (rows, term, datasetKeys = []) => {
  const list = Array.from(rows);
  list.forEach((row) => {
    const haystack = (
      datasetKeys.length
        ? datasetKeys.map((k) => row.dataset[k] || "").join(" ")
        : row.textContent || ""
    ).toLowerCase();
    row.style.display = haystack.includes(term) ? "" : "none";
  });
};

/**
 * Sorts rows by a dataset column.
 * @param {NodeList|HTMLElement[]} rows
 * @param {string} column - dataset key (e.g., 'username')
 * @param {boolean} ascending
 * @returns {HTMLElement[]} sorted rows
 */
const sortRowsByDataset = (rows, column, ascending = true) => {
  const list = Array.from(rows);
  return list.sort((a, b) => {
    const aVal = (a.dataset[column] || "").toLowerCase();
    const bVal = (b.dataset[column] || "").toLowerCase();
    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
};

/**
 * Updates sort indicators on header elements.
 * Removes existing indicators and sets the active one.
 * @param {NodeList|HTMLElement[]} headers
 * @param {HTMLElement} active
 * @param {boolean} asc
 */
const setSortIndicators = (headers, active, asc) => {
  Array.from(headers).forEach((h) =>
    h.classList.remove("sort-asc", "sort-desc")
  );
  if (active) active.classList.add(asc ? "sort-asc" : "sort-desc");
};
