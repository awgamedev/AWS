// ============================================================================
// UTILITIES
// ============================================================================

const setMessage = (el, type, text) => {
  if (!el) return;
  const color =
    type === "success"
      ? "text-green-600"
      : type === "error"
      ? "text-red-600"
      : "text-yellow-600";

  el.textContent = text;
  el.className = `mb-4 text-sm font-medium text-center ${color} block`;
};

const clearMessage = (el) => {
  if (!el) return;
  el.textContent = "";
  el.className = "mb-4 text-sm font-medium text-center hidden";
};

const toTaskPayload = (form) => {
  const data = Object.fromEntries(new FormData(form).entries());
  if (data.userId === "") data.userId = null;
  return data;
};

// ============================================================================
// DATE VALIDATION
// ============================================================================

const setupDateValidation = () => {
  const startDateInput = byId("startDate") || byId("edit-startDate");
  const endDateInput = byId("endDate") || byId("edit-endDate");

  if (!startDateInput || !endDateInput) return;

  const today = getTodayISO();
  if (startDateInput.value === "") startDateInput.value = today;
  if (endDateInput.value === "") endDateInput.value = today;

  const validateDates = () => {
    const start = new Date(startDateInput.value);
    const end = new Date(endDateInput.value);

    if (startDateInput.value && endDateInput.value && start > end) {
      endDateInput.value = startDateInput.value;
    }
  };

  startDateInput.addEventListener("change", validateDates);
  endDateInput.addEventListener("change", validateDates);
};

// ============================================================================
// MODAL HANDLERS
// ============================================================================

const fillEditForm = (data) => {
  const fieldMap = {
    "edit-taskId": data.taskId,
    "edit-taskName": data.taskName,
    "edit-taskStatus": data.taskStatus,
    "edit-taskPriority": data.taskPriority,
    "edit-userId": data.userId,
    "edit-taskDescription": data.taskDesc,
    "edit-startDate": data.startDate,
    "edit-endDate": data.endDate,
  };

  Object.entries(fieldMap).forEach(([id, value]) => {
    const el = byId(id);
    if (el && value !== undefined) el.value = value;
  });

  clearMessage(byId("edit-task-form-message"));
};

// ============================================================================
// FORM HANDLERS
// ============================================================================

const handleCreateTask = async (form) => {
  const msg = byId("task-form-message");
  setMessage(msg, "info", "Aufgabe wird gespeichert...");

  try {
    const payload = toTaskPayload(form);
    const { ok, data } = await api("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (ok) {
      setMessage(
        msg,
        "success",
        data.msg || "Aufgabe erfolgreich gespeichert!"
      );
      form.reset();
      reloadAfter();
    } else {
      setMessage(
        msg,
        "error",
        data.msg || "Fehler beim Speichern der Aufgabe."
      );
    }
  } catch (err) {
    console.error("Create task error:", err);
    setMessage(msg, "error", "Ein Netzwerkfehler ist aufgetreten.");
  }
};

const handleUpdateTask = async (form) => {
  const msg = byId("edit-task-form-message");
  const taskId = byId("edit-taskId")?.value;

  if (!taskId) {
    setMessage(msg, "error", "Fehler: Aufgaben-ID nicht gefunden.");
    return;
  }

  setMessage(msg, "info", "Änderungen werden gespeichert...");

  try {
    const payload = toTaskPayload(form);
    const { ok, data } = await api(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (ok) {
      setMessage(
        msg,
        "success",
        data.msg || "Aufgabe erfolgreich aktualisiert!"
      );
      reloadAfter();
    } else {
      setMessage(
        msg,
        "error",
        data.msg || "Fehler beim Aktualisieren der Aufgabe."
      );
    }
  } catch (err) {
    console.error("Update task error:", err);
    setMessage(msg, "error", "Ein Netzwerkfehler ist aufgetreten.");
  }
};

const handleDeleteTask = async () => {
  const msg = byId("edit-task-form-message");
  const taskId = byId("edit-taskId")?.value;

  if (
    !taskId ||
    !confirm("Sind Sie sicher, dass Sie diese Aufgabe löschen möchten?")
  ) {
    return;
  }

  setMessage(msg, "info", "Aufgabe wird gelöscht...");

  try {
    const { ok, data } = await api(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (ok) {
      setMessage(msg, "success", data.msg || "Aufgabe erfolgreich gelöscht!");
      reloadAfter();
    } else {
      setMessage(msg, "error", data.msg || "Fehler beim Löschen der Aufgabe.");
    }
  } catch (err) {
    console.error("Delete task error:", err);
    setMessage(msg, "error", "Netzwerkfehler beim Löschversuch.");
  }
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Initialize modal component
  initModal();

  // Open Create Task Modal
  const createBtn = byId("open-task-modal");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      openModalFromApi(
        window.CREATE_MODAL_TITLE || "Neue Aufgabe erstellen",
        "/api/modal/task-create",
        setupDateValidation
      );
    });
  }

  // Task items - open edit modal
  document.querySelectorAll(".task-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const data = e.currentTarget.dataset;
      openModalFromApi(
        `Aufgabe bearbeiten: ${data.taskName}`,
        "/api/modal/task-edit",
        () => {
          fillEditForm(data);
          setupDateValidation();
        }
      );
    });
  });

  // Form submissions (delegated)
  document.addEventListener("submit", async (e) => {
    const form = e.target;

    if (form.id === "create-task-form") {
      e.preventDefault();
      await handleCreateTask(form);
    } else if (form.id === "edit-task-form") {
      e.preventDefault();
      await handleUpdateTask(form);
    }
  });

  // Delete button (delegated)
  document.addEventListener("click", async (e) => {
    if (e.target.id === "delete-task-btn") {
      e.preventDefault();
      await handleDeleteTask();
    }
  });
});
