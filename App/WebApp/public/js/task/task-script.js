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

// ============================================================================
// WEEK NAVIGATION
// ============================================================================

let currentWeekOffset = parseInt(window.CURRENT_WEEK_OFFSET) || 0;

const showLoading = () => {
  const overlay = byId("loading-overlay");
  if (overlay) overlay.classList.remove("hidden");
};

const hideLoading = () => {
  const overlay = byId("loading-overlay");
  if (overlay) overlay.classList.add("hidden");
};

const updateWeekDisplay = () => {
  const offsetDisplay = byId("week-offset-display");
  if (offsetDisplay) {
    if (currentWeekOffset === 0) {
      offsetDisplay.textContent = "";
    } else if (currentWeekOffset > 0) {
      offsetDisplay.textContent = `+${currentWeekOffset} ${
        currentWeekOffset === 1 ? "week" : "weeks"
      }`;
    } else {
      offsetDisplay.textContent = `${currentWeekOffset} ${
        currentWeekOffset === -1 ? "week" : "weeks"
      }`;
    }
  }
};

const reattachTaskListeners = () => {
  document.querySelectorAll(".task-item").forEach((item) => {
    let lastTap = 0;

    item.addEventListener("click", (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 500 && tapLength > 0) {
        e.preventDefault();
      }
      lastTap = currentTime;

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

    item.addEventListener("touchstart", (e) => {
      e.currentTarget.style.opacity = "0.8";
    });

    item.addEventListener("touchend", (e) => {
      setTimeout(() => {
        e.currentTarget.style.opacity = "";
      }, 100);
    });

    item.addEventListener("touchcancel", (e) => {
      e.currentTarget.style.opacity = "";
    });
  });
};

const loadWeekData = async (offset) => {
  showLoading();
  currentWeekOffset = offset;

  try {
    const response = await api(`/api/task-board/week?offset=${offset}`);
    if (response && response.ok && response.data) {
      const { html, weekRange, weekOffset } = response.data;
      updateTaskBoard(html, weekRange);
      updateWeekDisplay();

      // Update URL without reload
      const url = new URL(window.location);
      if (offset === 0) {
        url.searchParams.delete("week");
      } else {
        url.searchParams.set("week", offset);
      }
      window.history.pushState({}, "", url);
    } else {
      console.error("Failed to load week data:", response);
      const errorMsg =
        response?.msg || response?.data?.msg || "Error loading week data";
      alert(errorMsg);
    }
  } catch (err) {
    console.error("Error loading week:", err);
    console.error("Error stack:", err.stack);
    alert(
      `Network error: ${err.message}\nPlease check if the server is running.`
    );
  } finally {
    hideLoading();
  }
};

const updateTaskBoard = (html, weekRange) => {
  console.log("updateTaskBoard called with rendered HTML");

  // Update week range display
  const weekRangeEl = byId("current-week-range");
  if (weekRangeEl) weekRangeEl.textContent = weekRange;

  // Find the content container (both desktop and mobile views)
  const contentContainer = document.querySelector(".task-board-content");
  if (contentContainer) {
    contentContainer.innerHTML = html;
  } else {
    // Fallback: update both views separately
    const desktopView = document.querySelector(".hidden.md\\:block");
    const mobileView = document.querySelector(".md\\:hidden.space-y-4");

    // Create a temporary container to parse the HTML
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Extract desktop and mobile content
    const newDesktopView = temp.querySelector(".hidden.md\\:block");
    const newMobileView = temp.querySelector(".md\\:hidden");

    if (desktopView && newDesktopView) {
      desktopView.innerHTML = newDesktopView.innerHTML;
    }

    if (mobileView && newMobileView) {
      mobileView.innerHTML = newMobileView.innerHTML;
    }
  }

  // Reattach event listeners to new task items
  reattachTaskListeners();
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

  // Initialize week display
  updateWeekDisplay();

  // Week Navigation Buttons
  const prevWeekBtn = byId("prev-week");
  const nextWeekBtn = byId("next-week");
  const todayWeekBtn = byId("today-week");

  if (prevWeekBtn) {
    prevWeekBtn.addEventListener("click", () => {
      loadWeekData(currentWeekOffset - 1);
    });
  }

  if (nextWeekBtn) {
    nextWeekBtn.addEventListener("click", () => {
      loadWeekData(currentWeekOffset + 1);
    });
  }

  if (todayWeekBtn) {
    todayWeekBtn.addEventListener("click", () => {
      loadWeekData(0);
    });
  }

  // Keyboard shortcuts for week navigation
  document.addEventListener("keydown", (e) => {
    // Only trigger if no modal is open and not in an input
    if (
      document.querySelector(".modal-overlay") ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    // Left arrow = previous week
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      loadWeekData(currentWeekOffset - 1);
    }
    // Right arrow = next week
    else if (e.key === "ArrowRight") {
      e.preventDefault();
      loadWeekData(currentWeekOffset + 1);
    }
    // T key = today's week
    else if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      loadWeekData(0);
    }
  });

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

  // Initialize task item listeners
  reattachTaskListeners();

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

  // Mobile-specific optimizations
  if (window.innerWidth <= 768) {
    // Optimize scroll performance on mobile
    const scrollContainers = document.querySelectorAll(
      ".task-scroll-container"
    );
    scrollContainers.forEach((container) => {
      container.style.webkitOverflowScrolling = "touch";
    });
  }
});
