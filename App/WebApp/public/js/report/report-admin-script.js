// Report admin calendar renderer
document.addEventListener("DOMContentLoaded", () => {
  // Initialize modal
  initModal();

  const yearInput = document.getElementById("year-input");
  const monthInput = document.getElementById("month-input");
  const calendarDiv = document.getElementById("calendar");
  const detailsDiv = document.getElementById("report-details");
  const createBtn = document.getElementById("create-report-btn");
  const switchBtn = document.getElementById("switch-to-list-view");
  let currentView = "calendar"; // 'calendar' | 'list'

  if (monthInput) monthInput.addEventListener("change", loadCalendar);
  if (yearInput) yearInput.addEventListener("change", loadCalendar);
  if (createBtn) createBtn.addEventListener("click", openCreateModal);
  if (switchBtn) switchBtn.addEventListener("click", toggleView);
  loadCalendar(); // initial

  // -------------------------------
  // View Toggle
  // -------------------------------
  async function toggleView() {
    if (currentView === "calendar") {
      await loadListView();
      currentView = "list";
      if (switchBtn && window.reportTranslations?.viewSwitch) {
        switchBtn.textContent = window.reportTranslations.viewSwitch.calendar;
      }
    } else {
      loadCalendar();
      currentView = "calendar";
      if (switchBtn && window.reportTranslations?.viewSwitch) {
        switchBtn.textContent = window.reportTranslations.viewSwitch.list;
      }
    }
  }

  async function loadCalendar() {
    const year = yearInput.value;
    const month = monthInput.value; // 1..12
    // Reset container classes for calendar layout
    calendarDiv.className = "grid grid-cols-7 gap-1 sm:gap-2";
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

  // Load list view HTML partial
  async function loadListView() {
    const year = yearInput.value;
    const month = monthInput.value; // 1..12
    // Apply list container styling similar to user list
    calendarDiv.className =
      "shadow overflow-hidden border-b border-gray-200 sm:rounded-lg relative max-h-96 overflow-y-auto overflow-x-auto";
    calendarDiv.innerHTML = "Lade...";
    detailsDiv.innerHTML = "";
    try {
      const resp = await fetch(
        `/reports/admin/list-view?year=${year}&month=${month}`
      );
      const html = await resp.text();
      if (!resp.ok) throw new Error("Fehler");
      calendarDiv.innerHTML = html;
      attachListItemHandlers();
    } catch (err) {
      calendarDiv.textContent = err.message || "Fehler beim Laden.";
    }
  }

  function attachListItemHandlers() {
    const rows = calendarDiv.querySelectorAll(".report-list-row");
    rows.forEach((row) => {
      row.addEventListener("click", () => {
        const r = {
          id: row.getAttribute("data-id"),
          user: row.getAttribute("data-user"),
          type: row.getAttribute("data-type"),
          status: row.getAttribute("data-status"),
          startDate: row.getAttribute("data-start"),
          endDate: row.getAttribute("data-end"),
          description: row.getAttribute("data-description") || "",
        };
        showDetails(r);
      });
    });
  }

  function renderCalendar(year, month, reports) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay(); // 0=Sunday, 1=Monday, etc.
    // Convert to Monday-based (0=Monday, 6=Sunday)
    const startWeekdayMondayBased = startWeekday === 0 ? 6 : startWeekday - 1;
    const mobile = isMobile();

    calendarDiv.innerHTML = "";
    calendarDiv.classList.add(mobile ? "text-[10px]" : "text-xs");

    // Add weekday headers (Monday first)
    const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    weekdays.forEach((day) => {
      const header = document.createElement("div");
      header.className = `text-center font-semibold p-1 bg-gray-100 border ${
        mobile ? "text-[9px]" : "text-xs"
      }`;
      header.textContent = day;
      calendarDiv.appendChild(header);
    });

    // Empty cells before first day
    for (let i = 0; i < startWeekdayMondayBased; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = `border p-1 bg-gray-50 ${mobile ? "h-16" : "h-20"}`;
      calendarDiv.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const cell = document.createElement("div");
      cell.className = `border p-1 overflow-auto relative ${
        mobile ? "h-16" : "h-20"
      }`;

      const label = document.createElement("div");
      label.className = `text-gray-600 text-right ${
        mobile ? "text-[9px]" : "text-[10px]"
      }`;
      label.textContent = day;
      cell.appendChild(label);

      // Reports covering this day
      const dayReports = reports.filter((r) => {
        // Normalize dates to local midnight for accurate comparison
        const reportStart = new Date(r.startDate);
        const reportEnd = new Date(r.endDate);
        const localStart = new Date(
          reportStart.getFullYear(),
          reportStart.getMonth(),
          reportStart.getDate()
        );
        const localEnd = new Date(
          reportEnd.getFullYear(),
          reportEnd.getMonth(),
          reportEnd.getDate()
        );
        return localStart <= dateObj && localEnd >= dateObj;
      });

      dayReports.forEach((r) => {
        const tag = document.createElement("div");
        const statusClass =
          r.status === "approved"
            ? "bg-green-200"
            : r.status === "rejected"
            ? "bg-red-200"
            : "bg-yellow-200";

        tag.className = `mt-1 px-1 rounded cursor-pointer touch-manipulation ${
          mobile ? "text-[9px] py-0.5" : "text-[10px]"
        } ${statusClass}`;

        const translatedType =
          window.reportTranslations?.types[r.type] || r.type;

        // On mobile, show abbreviated version
        if (mobile) {
          tag.textContent = `${(r.user || "?").substring(0, 3)}.`;
          tag.title = `${r.user || "?"}: ${translatedType} - ${
            r.description || ""
          }`;
        } else {
          tag.textContent = `${r.user || "?"}: ${translatedType}`;
          tag.title = r.description || "";
        }

        tag.addEventListener("click", () => showDetails(r));
        cell.appendChild(tag);
      });
      calendarDiv.appendChild(cell);
    }
  }

  function showDetails(r) {
    const params = new URLSearchParams({
      reportId: r.id,
      user: r.user || "?",
      type: r.type,
      status: r.status,
      startDate: r.startDate,
      endDate: r.endDate,
      description: r.description || "",
    });

    openModalFromApi(
      "Meldungsdetails",
      `/api/modal/report-details?${params.toString()}`,
      () => {
        // Setup action buttons
        const approveBtn = document.getElementById("approve-btn");
        const rejectBtn = document.getElementById("reject-btn");

        if (approveBtn) {
          approveBtn.addEventListener("click", () =>
            adminAction(r.id, "approve")
          );
        }
        if (rejectBtn) {
          rejectBtn.addEventListener("click", () =>
            adminAction(r.id, "reject")
          );
        }
      }
    );
  }

  async function adminAction(id, action) {
    const msgDiv = document.getElementById("admin-action-msg");
    if (!msgDiv) return;

    msgDiv.textContent = "Sende...";
    msgDiv.className = "mt-3 text-sm text-center text-gray-600";
    try {
      const resp = await fetch(`/reports/${id}/${action}`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.msg || "Fehler");
      msgDiv.textContent = data.msg;
      msgDiv.className = "mt-3 text-sm text-center text-green-600";
      // Close modal and refresh calendar after short delay
      setTimeout(() => {
        closeModal();
        loadCalendar();
      }, 1000);
    } catch (err) {
      msgDiv.textContent = err.message || "Aktion fehlgeschlagen.";
      msgDiv.className = "mt-3 text-sm text-center text-red-600";
    }
  }

  function openCreateModal() {
    openModalFromApi(
      "Meldung erstellen",
      "/api/modal/report-admin-create",
      () => {
        setupCreateForm();
      }
    );
  }

  function setupCreateForm() {
    const form = document.getElementById("admin-report-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFormErrors();

      const formData = new FormData(form);
      const data = {
        userId: formData.get("userId"),
        type: formData.get("type"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        description: formData.get("description"),
      };

      const msgDiv = document.getElementById("admin-report-form-message");
      if (msgDiv) {
        msgDiv.textContent = "Sende...";
        msgDiv.className = "text-sm font-medium text-center text-gray-600";
        msgDiv.classList.remove("hidden");
      }

      try {
        const resp = await fetch("/api/reports/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await resp.json();

        if (!resp.ok) {
          if (result.errors) {
            displayFormErrors(result.errors);
          }
          if (msgDiv) {
            msgDiv.textContent = result.msg || "Fehler beim Erstellen.";
            msgDiv.className = "text-sm font-medium text-center text-red-600";
          }
          return;
        }

        if (msgDiv) {
          msgDiv.textContent = result.msg || "Erfolgreich erstellt.";
          msgDiv.className = "text-sm font-medium text-center text-green-600";
        }

        setTimeout(() => {
          closeModal();
          loadCalendar();
        }, 1000);
      } catch (err) {
        if (msgDiv) {
          msgDiv.textContent = err.message || "Fehler beim Erstellen.";
          msgDiv.className = "text-sm font-medium text-center text-red-600";
        }
      }
    });
  }

  function clearFormErrors() {
    const errorFields = [
      "userId",
      "type",
      "startDate",
      "endDate",
      "dateRange",
      "overlap",
      "vacationDaysRemaining",
      "general",
    ];
    errorFields.forEach((field) => {
      const el = document.getElementById(`${field}-error`);
      if (el) {
        el.textContent = "";
        el.classList.add("hidden");
      }
    });
  }

  function displayFormErrors(errors) {
    Object.keys(errors).forEach((key) => {
      const el = document.getElementById(`${key}-error`);
      if (el) {
        el.textContent = errors[key];
        el.classList.remove("hidden");
      }
    });
  }
});
