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
// VIEW STATE
// ============================================================================

let currentView = "board"; // 'board' | 'list'
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

// ============================================================================
// VIEW TOGGLE
// ============================================================================

const toggleView = async () => {
  const switchBtn = byId("switch-to-list-view");

  if (currentView === "board") {
    await loadListView();
    currentView = "list";
    if (switchBtn && window.taskTranslations?.viewSwitch) {
      switchBtn.textContent = window.taskTranslations.viewSwitch.board;
    }
  } else {
    await loadBoardView();
    currentView = "board";
    if (switchBtn && window.taskTranslations?.viewSwitch) {
      switchBtn.textContent = window.taskTranslations.viewSwitch.list;
    }
  }
};

// ============================================================================
// BOARD VIEW
// ============================================================================

const loadBoardView = async () => {
  await loadWeekData(currentWeekOffset);
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

  // Update the content container
  const contentContainer = byId("task-content-container");
  if (contentContainer) {
    contentContainer.innerHTML = `<div class="task-board-content">${html}</div>`;
  }

  // Reattach event listeners to new task items
  reattachTaskListeners();
};

// ============================================================================
// LIST VIEW
// ============================================================================

const loadListView = async (offset = currentWeekOffset) => {
  showLoading();
  currentWeekOffset = offset;
  const contentContainer = byId("task-content-container");

  try {
    const response = await api(`/api/task-list/view?offset=${offset}`);
    if (response && response.ok && response.data) {
      const { html, weekRange, weekOffset } = response.data;
      if (contentContainer) {
        contentContainer.innerHTML = html;
      }
      // Update week range display
      const weekRangeEl = byId("current-week-range");
      if (weekRangeEl) weekRangeEl.textContent = weekRange;
      updateWeekDisplay();

      // Update URL without reload
      const url = new URL(window.location);
      if (offset === 0) {
        url.searchParams.delete("week");
      } else {
        url.searchParams.set("week", offset);
      }
      window.history.pushState({}, "", url);

      // Reattach event listeners
      reattachTaskListeners();
    } else {
      console.error("Failed to load list view:", response);
      const errorMsg =
        response?.msg || response?.data?.msg || "Error loading task list";
      alert(errorMsg);
    }
  } catch (err) {
    console.error("Error loading list view:", err);
    alert(
      `Network error: ${err.message}\nPlease check if the server is running.`
    );
  } finally {
    hideLoading();
  }
};

// ============================================================================
// TASK ITEM LISTENERS
// ============================================================================

const reattachTaskListeners = () => {
  // Task item click handlers (for editing existing tasks)
  document.querySelectorAll(".task-item").forEach((item) => {
    let lastTap = 0;

    item.addEventListener("click", (e) => {
      // Don't open edit modal if we just finished dragging
      if (dragState.hasMoved) {
        return;
      }

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
  });

  // Empty cell click handlers (for creating new tasks)
  document.querySelectorAll(".empty-task-cell").forEach((cell) => {
    cell.addEventListener("click", (e) => {
      const userId = e.currentTarget.dataset.userId;
      const dayName = e.currentTarget.dataset.dayName;
      openCreateModalWithPreselect(userId, dayName);
    });
  });

  // Add task button handlers (for creating new tasks in populated cells)
  document.querySelectorAll(".add-task-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent cell click
      const userId = e.currentTarget.dataset.userId;
      const dayName = e.currentTarget.dataset.dayName;
      openCreateModalWithPreselect(userId, dayName);
    });
  });
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
// DRAG AND DROP
// ============================================================================

let dragState = {
  isDragging: false,
  taskElement: null,
  taskData: null,
  startCell: null,
  ghostElement: null,
  dragStartX: 0,
  dragStartY: 0,
  hasMoved: false,
};

const initDragAndDrop = () => {
  let currentDropTarget = null;

  document.addEventListener("mousedown", handleDragStart);
  document.addEventListener("touchstart", handleDragStart, { passive: false });

  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("touchmove", handleDragMove, { passive: false });

  document.addEventListener("mouseup", handleDragEnd);
  document.addEventListener("touchend", handleDragEnd);
  document.addEventListener("touchcancel", handleDragEnd);

  function handleDragStart(e) {
    const taskItem = e.target.closest(".task-item");
    if (!taskItem || currentView !== "board") return;

    const touch = e.touches ? e.touches[0] : e;
    dragState.dragStartX = touch.clientX;
    dragState.dragStartY = touch.clientY;
    dragState.taskElement = taskItem;
    dragState.taskData = taskItem.dataset;
    dragState.startCell = taskItem.closest(
      ".task-cell-container, .task-cell-mobile"
    );
    dragState.hasMoved = false;
  }

  function handleDragMove(e) {
    if (!dragState.taskElement) return;

    const touch = e.touches ? e.touches[0] : e;
    const deltaX = Math.abs(touch.clientX - dragState.dragStartX);
    const deltaY = Math.abs(touch.clientY - dragState.dragStartY);

    // Start drag if moved more than 5px
    if (!dragState.isDragging && (deltaX > 5 || deltaY > 5)) {
      dragState.isDragging = true;
      dragState.hasMoved = true;
      startDrag();
    }

    if (dragState.isDragging) {
      e.preventDefault();
      updateGhostPosition(touch.clientX, touch.clientY);

      // Find drop target
      const elementBelow = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      );
      const dropCell = elementBelow?.closest(
        ".task-cell-container, .task-cell-mobile"
      );

      if (dropCell !== currentDropTarget) {
        if (currentDropTarget) {
          currentDropTarget.classList.remove("drag-over");
        }
        currentDropTarget = dropCell;
        if (currentDropTarget && currentDropTarget !== dragState.startCell) {
          currentDropTarget.classList.add("drag-over");
        }
      }
    }
  }

  function handleDragEnd(e) {
    if (!dragState.taskElement) return;

    const wasInSameCell = !dragState.isDragging;

    if (dragState.isDragging) {
      e.preventDefault();
      e.stopPropagation();

      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const elementBelow = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      );
      const dropCell = elementBelow?.closest(
        ".task-cell-container, .task-cell-mobile"
      );

      if (dropCell && dropCell !== dragState.startCell) {
        showMoveConfirmation(dropCell);
      }

      endDrag();

      // Set flag to prevent edit modal from opening
      if (dropCell && dropCell !== dragState.startCell) {
        dragState.hasMoved = true;
      }
    }

    if (currentDropTarget) {
      currentDropTarget.classList.remove("drag-over");
      currentDropTarget = null;
    }

    // Reset drag state after a short delay to prevent click event
    const shouldPreventClick = dragState.isDragging || dragState.hasMoved;

    setTimeout(
      () => {
        dragState = {
          isDragging: false,
          taskElement: null,
          taskData: null,
          startCell: null,
          ghostElement: null,
          dragStartX: 0,
          dragStartY: 0,
          hasMoved: false,
        };
      },
      shouldPreventClick ? 100 : 0
    );
  }

  function startDrag() {
    // Create ghost element
    const ghost = dragState.taskElement.cloneNode(true);
    ghost.classList.add("task-dragging-ghost");
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "10000";
    ghost.style.opacity = "0.8";
    ghost.style.transform = "scale(1.05)";
    ghost.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
    document.body.appendChild(ghost);
    dragState.ghostElement = ghost;

    // Highlight original
    dragState.taskElement.style.opacity = "0.3";

    // Disable text selection and interactions during drag
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.body.style.msUserSelect = "none";
    document.body.style.cursor = "grabbing";

    // Add CSS for drop zones
    const style = document.createElement("style");
    style.id = "drag-drop-styles";
    style.textContent = `
      .drag-over {
        background-color: rgba(79, 70, 229, 0.1) !important;
        border: 2px dashed #4f46e5 !important;
      }
      * {
        cursor: grabbing !important;
      }
    `;
    document.head.appendChild(style);
  }

  function updateGhostPosition(x, y) {
    if (dragState.ghostElement) {
      dragState.ghostElement.style.left = `${x + 10}px`;
      dragState.ghostElement.style.top = `${y + 10}px`;
    }
  }

  function endDrag() {
    if (dragState.ghostElement) {
      dragState.ghostElement.remove();
    }
    if (dragState.taskElement) {
      dragState.taskElement.style.opacity = "";
    }

    // Re-enable text selection and restore cursor
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
    document.body.style.msUserSelect = "";
    document.body.style.cursor = "";

    const style = document.getElementById("drag-drop-styles");
    if (style) style.remove();
  }
};

const showMoveConfirmation = (targetCell) => {
  const taskData = dragState.taskData;
  const newUserId = targetCell.dataset.userId;
  const newDayName = targetCell.dataset.dayName;

  // Calculate new dates
  const oldStartDate = new Date(taskData.startDate);
  const oldEndDate = taskData.endDate ? new Date(taskData.endDate) : null;
  const taskDuration = oldEndDate
    ? Math.ceil((oldEndDate - oldStartDate) / (1000 * 60 * 60 * 24))
    : 0;

  // Get the day that was actually grabbed (the cell where drag started)
  const grabbedDayName = dragState.startCell?.dataset.dayName;
  const grabbedDate = getDateFromDayName(grabbedDayName, currentWeekOffset);
  const grabbedDateObj = new Date(grabbedDate);

  // Calculate which day of the task was grabbed (0 = first day, 1 = second day, etc.)
  const dayOffset = Math.floor(
    (grabbedDateObj - oldStartDate) / (1000 * 60 * 60 * 24)
  );

  // The target date is where we want the grabbed day to be
  const targetDate = getDateFromDayName(newDayName, currentWeekOffset);
  const targetDateObj = new Date(targetDate);

  // Calculate the new start date by subtracting the day offset
  const newStartDateObj = new Date(targetDateObj);
  newStartDateObj.setDate(targetDateObj.getDate() - dayOffset);
  const newStartDate = newStartDateObj.toISOString().substring(0, 10);

  let newEndDate = null;
  if (oldEndDate && taskDuration > 0) {
    const newEndDateObj = new Date(newStartDateObj);
    newEndDateObj.setDate(newStartDateObj.getDate() + taskDuration);
    newEndDate = newEndDateObj.toISOString().substring(0, 10);
  }

  // Get user names from the board cells
  const oldUserCell = dragState.startCell
    ?.closest("tr")
    ?.querySelector("td:first-child span.font-semibold");
  const newUserCell = targetCell
    ?.closest("tr")
    ?.querySelector("td:first-child span.font-semibold");

  // For mobile view
  const oldUserMobile = dragState.startCell
    ?.closest(".bg-white.rounded-xl")
    ?.querySelector("h3.font-bold");
  const newUserMobile = targetCell
    ?.closest(".bg-white.rounded-xl")
    ?.querySelector("h3.font-bold");

  const oldUserName =
    oldUserCell?.textContent ||
    oldUserMobile?.textContent ||
    window.taskTranslations?.unassigned ||
    "Unassigned";
  const newUserName =
    newUserCell?.textContent ||
    newUserMobile?.textContent ||
    window.taskTranslations?.unassigned ||
    "Unassigned";

  // Build confirmation message
  const t = window.taskTranslations || {};
  const changes = [];

  if (taskData.userId !== newUserId) {
    changes.push(
      `<strong>${
        t.dragUser || "User"
      }:</strong> ${oldUserName} → ${newUserName}`
    );
  }
  if (taskData.startDate !== newStartDate) {
    changes.push(
      `<strong>${t.dragStartDate || "Start Date"}:</strong> ${formatDate(
        taskData.startDate
      )} → ${formatDate(newStartDate)}`
    );
  }
  if (newEndDate && taskData.endDate !== newEndDate) {
    changes.push(
      `<strong>${t.dragEndDate || "End Date"}:</strong> ${formatDate(
        taskData.endDate
      )} → ${formatDate(newEndDate)}`
    );
  }

  if (changes.length === 0) return;

  const confirmHtml = `
    <div class="p-4">
      <h3 class="text-lg font-semibold mb-4">${
        t.dragConfirmTitle || "Confirm Task Move"
      }</h3>
      <p class="mb-2"><strong>${t.dragTask || "Task"}:</strong> ${
    taskData.taskName
  }</p>
      <div class="mb-4 space-y-1">
        ${changes.join("<br>")}
      </div>
      <div class="flex gap-3 justify-end">
        <button id="cancel-move-btn" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition">
          ${t.cancel || "Cancel"}
        </button>
        <button id="confirm-move-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition">
          ${t.dragConfirmButton || "Confirm Move"}
        </button>
      </div>
    </div>
  `;

  openModal(t.dragConfirmTitle || "Confirm Task Move", confirmHtml);

  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    const cancelBtn = byId("cancel-move-btn");
    const confirmBtn = byId("confirm-move-btn");

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        closeModal();
      };
    }

    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        const t = window.taskTranslations || {};
        confirmBtn.textContent = t.dragMoving || "Moving...";
        await applyTaskMove(
          taskData.taskId,
          newUserId,
          newStartDate,
          newEndDate
        );
        closeModal();
      };
    }
  }, 100);
};

const applyTaskMove = async (taskId, newUserId, newStartDate, newEndDate) => {
  try {
    // Get existing task data to preserve other fields
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) {
      alert("Task element not found");
      return;
    }

    const taskData = taskElement.dataset;

    const payload = {
      userId: newUserId || null,
      taskName: taskData.taskName,
      taskDescription: taskData.taskDesc || "",
      taskPriority: taskData.taskPriority,
      taskStatus: taskData.taskStatus,
      startDate: newStartDate,
      endDate: newEndDate || null,
    };

    const { ok, data } = await api(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (ok) {
      // Reload the current view
      if (currentView === "board") {
        await loadWeekData(currentWeekOffset);
      } else {
        await loadListView(currentWeekOffset);
      }
    } else {
      alert(data.msg || "Failed to move task");
    }
  } catch (err) {
    console.error("Error moving task:", err);
    alert("Network error while moving task");
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE");
};

// ============================================================================
// MODAL HANDLERS
// ============================================================================

const openCreateModalWithPreselect = (userId, dayName) => {
  openModalFromApi(
    window.CREATE_MODAL_TITLE || "Neue Aufgabe erstellen",
    "/api/modal/task-create",
    () => {
      // Preselect user
      const userSelect = byId("userId");
      if (userSelect && userId) {
        userSelect.value = userId;
      }

      // Calculate date from day name and current week offset
      const dateStr = getDateFromDayName(dayName, currentWeekOffset);
      const startDateInput = byId("startDate");
      if (startDateInput && dateStr) {
        startDateInput.value = dateStr;
      }

      setupDateValidation();
    }
  );
};

const getDateFromDayName = (dayName, weekOffset) => {
  // Get the start of the current week (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  // Map day names to offsets from Monday (0-6)
  const dayMap = {
    Montag: 0,
    Monday: 0,
    Lundi: 0,
    Dienstag: 1,
    Tuesday: 1,
    Mardi: 1,
    Mittwoch: 2,
    Wednesday: 2,
    Mercredi: 2,
    Donnerstag: 3,
    Thursday: 3,
    Jeudi: 3,
    Freitag: 4,
    Friday: 4,
    Vendredi: 4,
    Samstag: 5,
    Saturday: 5,
    Samedi: 5,
    Sonntag: 6,
    Sunday: 6,
    Dimanche: 6,
  };

  // Find the day offset
  const dayOffset = dayMap[dayName] !== undefined ? dayMap[dayName] : 0;

  // Calculate the target date
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + dayOffset);

  // Format as YYYY-MM-DD
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

  // Initialize drag and drop
  initDragAndDrop();

  // Initialize week display
  updateWeekDisplay();

  // View Toggle Button
  const switchBtn = byId("switch-to-list-view");
  if (switchBtn) {
    switchBtn.addEventListener("click", toggleView);
  }

  // Week Navigation Buttons
  const prevWeekBtn = byId("prev-week");
  const nextWeekBtn = byId("next-week");
  const todayWeekBtn = byId("today-week");

  if (prevWeekBtn) {
    prevWeekBtn.addEventListener("click", () => {
      if (currentView === "board") {
        loadWeekData(currentWeekOffset - 1);
      } else {
        loadListView(currentWeekOffset - 1);
      }
    });
  }

  if (nextWeekBtn) {
    nextWeekBtn.addEventListener("click", () => {
      if (currentView === "board") {
        loadWeekData(currentWeekOffset + 1);
      } else {
        loadListView(currentWeekOffset + 1);
      }
    });
  }

  if (todayWeekBtn) {
    todayWeekBtn.addEventListener("click", () => {
      if (currentView === "board") {
        loadWeekData(0);
      } else {
        loadListView(0);
      }
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
      if (currentView === "board") {
        loadWeekData(currentWeekOffset - 1);
      } else {
        loadListView(currentWeekOffset - 1);
      }
    }
    // Right arrow = next week
    else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (currentView === "board") {
        loadWeekData(currentWeekOffset + 1);
      } else {
        loadListView(currentWeekOffset + 1);
      }
    }
    // T key = today's week
    else if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      if (currentView === "board") {
        loadWeekData(0);
      } else {
        loadListView(0);
      }
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
