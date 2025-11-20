// Report list search & basic client-side filtering
// -------------------------------
// Initialization
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("reportSearch");
  const tbody = document.getElementById("reportTableBody");
  if (!searchInput || !tbody) return;

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row) => {
      const haystack = [
        row.dataset.type,
        row.dataset.start,
        row.dataset.end,
        row.dataset.status,
        row.dataset.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!term || haystack.includes(term)) {
        row.classList.remove("hidden");
      } else {
        row.classList.add("hidden");
      }
    });
  });
});
