// Report list search & basic client-side filtering
// -------------------------------
// Utilities
// -------------------------------
const setMessage = (el, type, text) => {
  if (!el) return;
  const color =
    type === "success"
      ? "text-green-600"
      : type === "error"
      ? "text-red-600"
      : "text-yellow-600";
  el.textContent = text;
  el.className = `text-sm font-medium text-center ${color} block`;
};

const clearErrors = () => {
  ["type", "startDate", "endDate", "dateRange", "overlap", "general"].forEach(
    (id) => {
      const el = document.getElementById(`${id}-error`);
      if (el) {
        el.textContent = "";
        el.classList.add("hidden");
      }
    }
  );
};

const showErrors = (errors) => {
  clearErrors();
  Object.entries(errors).forEach(([field, message]) => {
    const el = document.getElementById(`${field}-error`);
    if (el) {
      el.textContent = message;
      el.classList.remove("hidden");
    }
  });
};
// -------------------------------
// Modal Handlers
// -------------------------------
const fillEditForm = (data) => {
  document.getElementById("report-id").value = data.id || "";
  document.getElementById("report-type").value = data.type || "";
  document.getElementById("report-startDate").value = data.startDate || "";
  document.getElementById("report-endDate").value = data.endDate || "";
  document.getElementById("report-description").value = data.description || "";
  clearErrors();
};

window.openEditReportModal = (id, type, startDate, endDate, description) => {
  openModalFromApi(
    "Report bearbeiten",
    `/api/modal/report-edit?reportId=${id}`,
    () => {
      fillEditForm({ id, type, startDate, endDate, description });
    }
  );
};

// -------------------------------
// Form Submission
// -------------------------------
const handleReportSubmit = async (form) => {
  const msg = document.getElementById("report-form-message");
  const reportId = document.getElementById("report-id").value;
  const isEditing = !!reportId;

  console.log("handleReportSubmit called", { isEditing, reportId });

  setMessage(msg, "info", "Speichern...");
  clearErrors();

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    console.log("Payload:", payload);

    const url = isEditing ? `/api/reports/${reportId}` : "/api/reports";
    const method = isEditing ? "PUT" : "POST";

    console.log("Request:", { url, method });

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (response.ok) {
      setMessage(msg, "success", data.msg || "Erfolgreich gespeichert!");
      reloadAfter();
    } else {
      if (data.errors) {
        showErrors(data.errors);
      }
      setMessage(msg, "error", data.msg || "Fehler beim Speichern.");
    }
  } catch (err) {
    console.error("Report submit error:", err);
    setMessage(msg, "error", "Ein Netzwerkfehler ist aufgetreten.");
  }
};

// -------------------------------
// Initialization
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Initialize modal
  initModal();

  // Search functionality
  const searchInput = document.getElementById("reportSearch");
  const tbody = document.getElementById("reportTableBody");
  if (searchInput && tbody) {
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
  }

  // Create report button
  const createBtn = document.getElementById("open-report-modal");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      openModalFromApi("Report anlegen", "/api/modal/report-create", () => {
        clearErrors();
        // Initialize start and end date to current day
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("report-startDate").value = today;
        document.getElementById("report-endDate").value = today;
      });
    });
  }

  // Edit report buttons (delegated)
  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-report-btn");
    if (editBtn) {
      const { id, type, start, end, description } = editBtn.dataset;
      window.openEditReportModal(id, type, start, end, description);
    }
  });
});

// Form submission (delegated) - outside DOMContentLoaded to catch dynamically loaded forms
document.addEventListener("submit", async (e) => {
  if (e.target && e.target.getAttribute("id") === "report-form") {
    e.preventDefault();
    await handleReportSubmit(e.target);
  }
});
