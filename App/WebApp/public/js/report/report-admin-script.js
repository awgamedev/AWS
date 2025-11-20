// Report admin calendar renderer
document.addEventListener("DOMContentLoaded", () => {
  const yearInput = document.getElementById("year-input");
  const monthInput = document.getElementById("month-input");
  const loadBtn = document.getElementById("load-calendar");
  const calendarDiv = document.getElementById("calendar");
  const detailsDiv = document.getElementById("report-details");

  loadBtn.addEventListener("click", loadCalendar);
  loadCalendar(); // initial

  async function loadCalendar() {
    const year = yearInput.value;
    const month = monthInput.value; // 1..12
    calendarDiv.innerHTML = "Lade...";
    detailsDiv.innerHTML = "";
    try {
      const resp = await fetch(
        `/reports/admin/list?year=${year}&month=${month}`
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.msg || "Fehler");
      renderCalendar(year, month, data.items || []);
    } catch (err) {
      calendarDiv.textContent = err.message || "Fehler beim Laden.";
    }
  }

  function renderCalendar(year, month, reports) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay(); // 0=So

    calendarDiv.innerHTML = "";
    calendarDiv.classList.add("text-xs");

    // Empty cells before first day
    for (let i = 0; i < startWeekday; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "border p-1 h-20 bg-gray-50";
      calendarDiv.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const cell = document.createElement("div");
      cell.className = "border p-1 h-20 overflow-auto relative";
      const label = document.createElement("div");
      label.className = "text-gray-600 text-right text-[10px]";
      label.textContent = day;
      cell.appendChild(label);

      // Reports covering this day
      const dayReports = reports.filter((r) => {
        return (
          new Date(r.startDate) <= dateObj && new Date(r.endDate) >= dateObj
        );
      });

      dayReports.forEach((r) => {
        const tag = document.createElement("div");
        tag.className = `mt-1 px-1 rounded text-[10px] cursor-pointer ${
          r.status === "approved"
            ? "bg-green-200"
            : r.status === "rejected"
            ? "bg-red-200"
            : "bg-yellow-200"
        }`;
        tag.textContent = `${r.user || "?"}: ${r.type}`;
        tag.title = r.description || "";
        tag.addEventListener("click", () => showDetails(r));
        cell.appendChild(tag);
      });
      calendarDiv.appendChild(cell);
    }
  }

  function showDetails(r) {
    detailsDiv.innerHTML = `<div class="p-4 border rounded">
      <h2 class="font-semibold mb-2">Report Details</h2>
      <p><strong>User:</strong> ${r.user}</p>
      <p><strong>Typ:</strong> ${r.type}</p>
      <p><strong>Status:</strong> ${r.status}</p>
      <p><strong>Von:</strong> ${new Date(r.startDate).toLocaleDateString(
        "de-DE"
      )}</p>
      <p><strong>Bis:</strong> ${new Date(r.endDate).toLocaleDateString(
        "de-DE"
      )}</p>
      <p><strong>Beschreibung:</strong> ${r.description || ""}</p>
      <div class="mt-3 space-x-2">
        <button id="approve-btn" class="bg-green-600 text-white px-2 py-1 rounded">Genehmigen</button>
        <button id="reject-btn" class="bg-red-600 text-white px-2 py-1 rounded">Ablehnen</button>
      </div>
      <div id="admin-action-msg" class="mt-2 text-sm"></div>
    </div>`;

    document
      .getElementById("approve-btn")
      .addEventListener("click", () => adminAction(r.id, "approve"));
    document
      .getElementById("reject-btn")
      .addEventListener("click", () => adminAction(r.id, "reject"));
  }

  async function adminAction(id, action) {
    const msgDiv = document.getElementById("admin-action-msg");
    msgDiv.textContent = "Sende...";
    msgDiv.className = "mt-2 text-sm text-gray-600";
    try {
      const resp = await fetch(`/reports/${id}/${action}`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.msg || "Fehler");
      msgDiv.textContent = data.msg;
      msgDiv.className = "mt-2 text-sm text-green-600";
      // refresh calendar to reflect status
      loadCalendar();
    } catch (err) {
      msgDiv.textContent = err.message || "Aktion fehlgeschlagen.";
      msgDiv.className = "mt-2 text-sm text-red-600";
    }
  }
});
