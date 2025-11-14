document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------
  // Utilities
  // -------------------------------
  const MODAL_RENDER_DELAY_MS = 100;

  const byId = (id) => document.getElementById(id);

  const setMessage = (el, type, text) => {
    const color =
      type === "success"
        ? "text-green-600"
        : type === "error"
        ? "text-red-600"
        : "text-yellow-600";

    el.textContent = text;
    el.className = `mb-4 text-sm font-medium text-center ${color} block`;
  };

  // -------------------------------
  // Open Create Task Modal (jQuery)
  // -------------------------------
  $("#open-task-modal").on("click", function () {
    openModal(window.CREATE_MODAL_TITLE, window.CREATE_TASK_HTML);
    setTimeout(setDatesOnChange, MODAL_RENDER_DELAY_MS);
  });

  // -------------------------------
  // Unassigned Tasks Button (jQuery)
  // -------------------------------
  $("#unassigned-tasks-btn").on("click", function () {
    const action = $(this).data("action");
    if (action === "navigate") {
      window.location.href = "/task-backlog";
    } else {
      openModal(window.EDIT_MODAL_TITLE, window.EDIT_TASK_STATIC_HTML);
    }
  });

  // -------------------------------
  // Task list items -> open edit modal (jQuery)
  // -------------------------------
  $(".task-item").on("click", function () {
    const data = $(this).data();
    openModal(
      `Aufgabe bearbeiten: ${data.taskName}`,
      window.EDIT_TASK_STATIC_HTML
    );
    setTimeout(() => fillEditFormFromDataset(data), MODAL_RENDER_DELAY_MS);
  });

  // -------------------------------
  // Delete task button (jQuery delegated)
  // -------------------------------
  $(document).on("click", "#delete-task-btn", async function () {
    const msg = byId("edit-task-form-message");
    const taskId = $("#edit-taskId").val();

    if (
      !taskId ||
      !confirm("Sind Sie sicher, dass Sie diese Aufgabe löschen möchten?")
    ) {
      return;
    }

    setMessage(msg, "error", "Aufgabe wird gelöscht...");

    try {
      const { ok, data } = await api(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (ok) {
        setMessage(msg, "success", data.msg || "Aufgabe erfolgreich gelöscht!");
        reloadAfter();
      } else {
        setMessage(
          msg,
          "error",
          data.msg || "Fehler beim Löschen der Aufgabe."
        );
      }
    } catch (err) {
      console.error("Fetch Delete Fehler:", err);
      setMessage(msg, "error", "Netzwerkfehler beim Löschversuch.");
    }
  });

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

  // -------------------------------
  // Create Task Modal
  // -------------------------------
  const initOpenCreateTaskModal = () => {
    const btn = byId("open-task-modal");
    if (!btn) {
      console.error("Button 'open-task-modal' nicht gefunden!");
      return;
    }

    btn.addEventListener("click", () => {
      openModal(window.CREATE_MODAL_TITLE, window.CREATE_TASK_HTML);
      setTimeout(setDatesOnChange, MODAL_RENDER_DELAY_MS);
    });
  };

  // -------------------------------
  // Unassigned Tasks Button
  // - Either navigate or show modal (based on data-action)
  // -------------------------------
  const initUnassignedTasksButton = () => {
    const btn = byId("unassigned-tasks-btn");
    if (!btn) {
      console.error("Button 'unassigned-tasks-btn' nicht gefunden!");
      return;
    }

    const action = btn.getAttribute("data-action");
    btn.addEventListener("click", () => {
      if (action === "navigate") {
        window.location.href = "/task-backlog";
      } else {
        openModal(window.EDIT_MODAL_TITLE, window.EDIT_TASK_STATIC_HTML);
      }
    });
  };

  // -------------------------------
  // Form submits (delegated)
  // -------------------------------
  document.addEventListener("submit", async (e) => {
    const { target } = e;

    // Create Task
    if (target.id === "create-task-form") {
      e.preventDefault();

      const msg = byId("task-form-message");
      setMessage(msg, "info", "Aufgabe wird gespeichert...");

      try {
        const payload = toTaskPayload(target);
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
          target.reset();
          reloadAfter();
        } else {
          setMessage(
            msg,
            "error",
            data.msg || "Fehler beim Speichern der Aufgabe."
          );
        }
      } catch (err) {
        console.error("Fetch Fehler:", err);
        setMessage(msg, "error", "Ein Netzwerkfehler ist aufgetreten.");
      }
    }

    // Edit Task
    if (target.id === "edit-task-form") {
      e.preventDefault();

      const msg = byId("edit-task-form-message");
      const taskId = byId("edit-taskId")?.value;

      if (!taskId) {
        setMessage(msg, "error", "Fehler: Aufgaben-ID nicht gefunden.");
        return;
      }

      setMessage(msg, "info", "Änderungen werden gespeichert...");

      try {
        const payload = toTaskPayload(target);
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
        console.error("Fetch Fehler (PUT):", err);
        setMessage(msg, "error", "Ein Netzwerkfehler ist aufgetreten.");
      }
    }
  });

  // -------------------------------
  // Task list item -> open edit modal and populate
  // -------------------------------
  const fillEditFormFromDataset = (data) => {
    const map = {
      "edit-taskId": data.taskId,
      "edit-taskName": data.taskName,
      "edit-taskStatus": data.taskStatus,
      "edit-taskPriority": data.taskPriority,
      "edit-userId": data.userId,
      "edit-taskDescription": data.taskDesc,
      "edit-startDate": data.startDate,
      "edit-endDate": data.endDate,
    };

    Object.entries(map).forEach(([id, value]) => {
      const el = byId(id);
      if (el && value !== undefined) el.value = value;
    });

    clearMessage(byId("edit-task-form-message"));
  };

  document.querySelectorAll(".task-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const data = e.currentTarget.dataset;

      openModal(
        `Aufgabe bearbeiten: ${data.taskName}`,
        window.EDIT_TASK_STATIC_HTML
      );

      setTimeout(() => fillEditFormFromDataset(data), MODAL_RENDER_DELAY_MS);
    });
  });

  // -------------------------------
  // Delete task (delegated)
  // -------------------------------
  document.addEventListener("click", async (e) => {
    if (e.target.id !== "delete-task-btn") return;

    const msg = byId("edit-task-form-message");
    const taskId = byId("edit-taskId")?.value;

    if (
      !taskId ||
      !confirm("Sind Sie sicher, dass Sie diese Aufgabe löschen möchten?")
    ) {
      return;
    }

    setMessage(msg, "error", "Aufgabe wird gelöscht...");

    try {
      const { ok, data } = await api(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (ok) {
        setMessage(msg, "success", data.msg || "Aufgabe erfolgreich gelöscht!");
        reloadAfter();
      } else {
        setMessage(
          msg,
          "error",
          data.msg || "Fehler beim Löschen der Aufgabe."
        );
      }
    } catch (err) {
      console.error("Fetch Delete Fehler:", err);
      setMessage(msg, "error", "Netzwerkfehler beim Löschversuch.");
    }
  });

  // -------------------------------
  // Init
  // -------------------------------
  initOpenCreateTaskModal();
  initUnassignedTasksButton();
});

// -------------------------------
// Date helpers (jQuery-based)
// -------------------------------
function setDatesOnChange() {
  const today = getTodayISO();
  $("#startDate").val(today);
  $("#endDate").val(today);

  $("#startDate").on("change", function () {
    const startVal = $(this).val();
    const endInput = $("#endDate");
    const endVal = endInput.val();
    const errorEl = $("#date-error");

    const start = new Date(startVal);
    const end = new Date(endVal);

    if (startVal && start.getTime() >= end.getTime()) {
      endInput.val(startVal);
      errorEl.stop(true, true).fadeIn().delay(3000).fadeOut();
    }
  });

  $("#endDate").on("change", function () {
    const endVal = $(this).val();
    const startInput = $("#startDate");
    const startVal = startInput.val();
    const errorEl = $("#date-error");

    const start = new Date(startVal);
    const end = new Date(endVal);

    if (endVal && start.getTime() >= end.getTime()) {
      startInput.val(endVal);
      errorEl.stop(true, true).fadeIn().delay(3000).fadeOut();
    }
  });
}
