//
// Datei: public/js/userList.js
//

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("userSearch");
  const tableBody = document.getElementById("userTableBody");
  const table = document.getElementById("userTable");
  const headers = table.querySelectorAll(".sortable");
  let currentSortColumn = null;
  let isAscending = true;

  // --- 1. Suchfunktion ---
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      const rows = tableBody.querySelectorAll("tr");

      rows.forEach((row) => {
        // Konkateniere alle Textinhalte der Spalten (username, email, role)
        const rowText =
          `${row.dataset.username} ${row.dataset.email} ${row.dataset.role}`.toLowerCase();

        // Zeile anzeigen, wenn der Suchbegriff enthalten ist, sonst ausblenden
        if (rowText.includes(searchTerm)) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      });
    });
  }

  // Fügt Sortier-Event-Listener zu allen Spaltenköpfen hinzu
  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const column = header.dataset.column;

      // Wenn die gleiche Spalte erneut geklickt wird, ändere die Sortierrichtung
      if (currentSortColumn === column) {
        isAscending = !isAscending;
      } else {
        // Wenn eine neue Spalte geklickt wird, setze auf aufsteigend
        currentSortColumn = column;
        isAscending = true;
      }

      sortUsers(column, isAscending);
      updateSortIndicators(header, isAscending);
    });
  });

  /**
   * Sortiert die Tabellenzeilen basierend auf einer Spalte und der Sortierrichtung.
   * @param {string} column - Die Spalte (z.B. 'username', 'email', 'role').
   * @param {boolean} ascending - True für aufsteigend (A-Z, 1-9), False für absteigend.
   */
  function sortUsers(column, ascending) {
    const rowsArray = Array.from(tableBody.querySelectorAll("tr"));

    rowsArray.sort((a, b) => {
      // Holt den Textinhalt aus der korrekten Zelle basierend auf der Spalte
      const aValue = a
        .querySelector(`[data-${column}]`)
        .textContent.trim()
        .toLowerCase();
      const bValue = b
        .querySelector(`[data-${column}]`)
        .textContent.trim()
        .toLowerCase();

      if (aValue < bValue) {
        return ascending ? -1 : 1;
      }
      if (aValue > bValue) {
        return ascending ? 1 : -1;
      }
      return 0;
    });

    // Die sortierten Zeilen zurück in die Tabelle einfügen
    rowsArray.forEach((row) => {
      tableBody.appendChild(row);
    });
  }

  /**
   * Aktualisiert die visuellen Sortierindikatoren (Pfeile) in den Spaltenköpfen.
   * @param {HTMLElement} activeHeader - Der Spaltenkopf, der gerade sortiert wird.
   * @param {boolean} isAsc - Die aktuelle Sortierrichtung.
   */
  function updateSortIndicators(activeHeader, isAsc) {
    headers.forEach((header) => {
      // Entferne alle Sortierklassen von allen Spaltenköpfen
      header.classList.remove("sort-asc", "sort-desc");
    });

    // Füge die korrekte Sortierklasse zum aktiven Spaltenkopf hinzu
    if (isAsc) {
      activeHeader.classList.add("sort-asc");
    } else {
      activeHeader.classList.add("sort-desc");
    }
  }

  // Initialisierung: Sortiere nach 'username' beim Laden der Seite (optional)
  const initialHeader = table.querySelector('[data-column="username"]');
  if (initialHeader) {
    // Starte mit aufsteigender Sortierung nach dem Benutzernamen
    sortUsers("username", true);
    updateSortIndicators(initialHeader, true);
    currentSortColumn = "username";
    isAscending = true;
  }
});
