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

  // Reinitialize hover highlighting for multi-day tasks
  initTaskHoverHighlight();
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

const initTaskHoverHighlight = () => {
  const taskItems = document.querySelectorAll(".task-item");

  taskItems.forEach((item) => {
    item.addEventListener("mouseenter", (e) => {
      const taskId = e.currentTarget.dataset.taskId;
      if (!taskId) return;

      // Highlight all task items with the same taskId
      document
        .querySelectorAll(`.task-item[data-task-id="${taskId}"]`)
        .forEach((relatedItem) => {
          relatedItem.classList.add("task-highlight");
        });
    });

    item.addEventListener("mouseleave", (e) => {
      const taskId = e.currentTarget.dataset.taskId;
      if (!taskId) return;

      // Remove highlight from all task items with the same taskId
      document
        .querySelectorAll(`.task-item[data-task-id="${taskId}"]`)
        .forEach((relatedItem) => {
          relatedItem.classList.remove("task-highlight");
        });
    });
  });
};

const reattachTaskListeners = () => {
  // Unassigned task chip click handlers
  document.querySelectorAll(".unassigned-task-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      const data = e.currentTarget.dataset;
      showUnassignedTaskModal(data);
    });
  });

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

    // Right-click context menu handler
    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const data = e.currentTarget.dataset;
      showTaskContextMenu(e.clientX, e.clientY, e.currentTarget, data);
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
// CONTEXT MENU
// ============================================================================

const showTaskContextMenu = (x, y, taskElement, taskData) => {
  // Remove existing context menu if any
  hideContextMenu();

  // Create context menu
  const menu = document.createElement("div");
  menu.id = "task-context-menu";
  menu.className =
    "fixed bg-white rounded-lg shadow-2xl border border-gray-200 py-2 z-[10000]";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.minWidth = "200px";

  const t = window.taskTranslations || {};

  const priorities = [
    {
      value: "high",
      label: t.contextMenuPriorityHigh,
      icon: "fa-exclamation-circle",
      color: "text-red-600",
    },
    {
      value: "medium",
      label: t.contextMenuPriorityMedium,
      icon: "fa-exclamation-triangle",
      color: "text-yellow-600",
    },
    {
      value: "low",
      label: t.contextMenuPriorityLow,
      icon: "fa-info-circle",
      color: "text-green-600",
    },
  ];

  const statuses = [
    {
      value: "pending",
      label: t.contextMenuStatusPending || "Pending",
      icon: "fa-clock",
      color: "text-gray-600",
    },
    {
      value: "in-progress",
      label: t.contextMenuStatusInProgress || "In Progress",
      icon: "fa-spinner",
      color: "text-blue-600",
    },
    {
      value: "completed",
      label: t.contextMenuStatusCompleted || "Completed",
      icon: "fa-check-circle",
      color: "text-green-600",
    },
  ];

  const currentPriority = taskData.taskPriority;
  const currentStatus = taskData.taskStatus;

  // Build menu HTML
  let menuHTML = `
    <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
      ${taskData.taskName}
    </div>
    
    <!-- Priority submenu -->
    <div class="px-1">
      <div class="px-3 py-2 text-xs font-semibold text-gray-500 mt-1">${
        t.contextMenuChangePriority || "Change Priority"
      }</div>
  `;

  priorities.forEach((priority) => {
    const isActive = currentPriority === priority.value;
    menuHTML += `
      <button 
        class="context-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2 transition ${
          isActive ? "bg-gray-50" : ""
        }"
        data-action="change-priority"
        data-priority="${priority.value}">
        <i class="fas ${priority.icon} ${priority.color}"></i>
        <span>${priority.label}</span>
        ${
          isActive ? '<i class="fas fa-check ml-auto text-indigo-600"></i>' : ""
        }
      </button>
    `;
  });

  menuHTML += `
    </div>
    
    <!-- Status submenu -->
    <div class="px-1">
      <div class="px-3 py-2 text-xs font-semibold text-gray-500 mt-1">${
        t.contextMenuChangeStatus || "Change Status"
      }</div>
  `;

  statuses.forEach((status) => {
    const isActive = currentStatus === status.value;
    menuHTML += `
      <button 
        class="context-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2 transition ${
          isActive ? "bg-gray-50" : ""
        }"
        data-action="change-status"
        data-status="${status.value}">
        <i class="fas ${status.icon} ${status.color}"></i>
        <span>${status.label}</span>
        ${
          isActive ? '<i class="fas fa-check ml-auto text-indigo-600"></i>' : ""
        }
      </button>
    `;
  });

  menuHTML += `
    </div>
    
    <div class="border-t border-gray-200 my-1"></div>
    
    <!-- Delete option -->
    <button 
      class="context-menu-item w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 rounded flex items-center gap-2 transition"
      data-action="delete">
      <i class="fas fa-trash"></i>
      <span>${t.contextMenuDeleteTask || "Delete Task"}</span>
    </button>
  `;

  menu.innerHTML = menuHTML;
  document.body.appendChild(menu);

  // Store state
  contextMenuState.menu = menu;
  contextMenuState.currentTaskElement = taskElement;
  contextMenuState.currentTaskData = taskData;

  // Adjust position if menu goes off screen
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${x - rect.width}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${y - rect.height}px`;
  }

  // Add click handlers to menu items
  menu.querySelectorAll(".context-menu-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      const action = e.currentTarget.dataset.action;

      if (action === "delete") {
        await handleContextMenuDelete();
      } else if (action === "change-priority") {
        const newPriority = e.currentTarget.dataset.priority;
        await handleContextMenuChangePriority(newPriority);
      } else if (action === "change-status") {
        const newStatus = e.currentTarget.dataset.status;
        await handleContextMenuChangeStatus(newStatus);
      }

      hideContextMenu();
    });
  });

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener("click", hideContextMenu);
    document.addEventListener("contextmenu", hideContextMenu);
  }, 0);
};

const hideContextMenu = () => {
  if (contextMenuState.menu) {
    contextMenuState.menu.remove();
    document.removeEventListener("click", hideContextMenu);
    document.removeEventListener("contextmenu", hideContextMenu);
  }
  contextMenuState = {
    menu: null,
    currentTaskElement: null,
    currentTaskData: null,
  };
};

const handleContextMenuDelete = async () => {
  const taskData = contextMenuState.currentTaskData;
  if (!taskData || !taskData.taskId) return;

  const t = window.taskTranslations || {};
  const confirmMessage =
    t.confirmDeleteTask ||
    "Sind Sie sicher, dass Sie diese Aufgabe löschen möchten?";

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const { ok, data } = await api(`/api/tasks/${taskData.taskId}`, {
      method: "DELETE",
    });

    if (ok) {
      // Reload the current view
      if (currentView === "board") {
        await loadWeekData(currentWeekOffset);
      } else {
        await loadListView(currentWeekOffset);
      }
    } else {
      alert(data.msg || "Failed to delete task");
    }
  } catch (err) {
    console.error("Error deleting task:", err);
    alert("Network error while deleting task");
  }
};

const handleContextMenuChangePriority = async (newPriority) => {
  const taskData = contextMenuState.currentTaskData;
  if (!taskData || !taskData.taskId) return;

  try {
    const payload = {
      userId: taskData.userId || null,
      taskName: taskData.taskName,
      taskDescription: taskData.taskDesc || "",
      taskPriority: newPriority,
      taskStatus: taskData.taskStatus,
      startDate: taskData.startDate,
      endDate: taskData.endDate || null,
    };

    const { ok, data } = await api(`/api/tasks/${taskData.taskId}`, {
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
      alert(data.msg || "Failed to change priority");
    }
  } catch (err) {
    console.error("Error changing priority:", err);
    alert("Network error while changing priority");
  }
};

const handleContextMenuChangeStatus = async (newStatus) => {
  const taskData = contextMenuState.currentTaskData;
  if (!taskData || !taskData.taskId) return;

  try {
    const payload = {
      userId: taskData.userId || null,
      taskName: taskData.taskName,
      taskDescription: taskData.taskDesc || "",
      taskPriority: taskData.taskPriority,
      taskStatus: newStatus,
      startDate: taskData.startDate,
      endDate: taskData.endDate || null,
    };

    const { ok, data } = await api(`/api/tasks/${taskData.taskId}`, {
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
      alert(data.msg || "Failed to change status");
    }
  } catch (err) {
    console.error("Error changing status:", err);
    alert("Network error while changing status");
  }
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

// Cell selection drag state
let cellDragState = {
  isDragging: false,
  startCell: null,
  currentCell: null,
  startRow: null,
  dragStartX: 0,
  dragStartY: 0,
};

// Context menu state
let contextMenuState = {
  menu: null,
  currentTaskElement: null,
  currentTaskData: null,
};

const isMobileDevice = () => {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(pointer: coarse)").matches ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ))
  );
};

const initDragAndDrop = () => {
  if (isMobileDevice()) {
    // Disable drag-and-drop on mobile devices
    return;
  }
  let currentDropTarget = null;

  document.addEventListener("mousedown", handleDragStart);
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);

  // Cell selection drag handlers
  document.addEventListener("mousedown", handleCellDragStart);
  document.addEventListener("mousemove", handleCellDragMove);
  document.addEventListener("mouseup", handleCellDragEnd);

  function handleDragStart(e) {
    const taskItem = e.target.closest(".task-item");
    if (!taskItem || currentView !== "board") return;

    dragState.dragStartX = e.clientX;
    dragState.dragStartY = e.clientY;
    dragState.taskElement = taskItem;
    dragState.taskData = taskItem.dataset;
    dragState.startCell = taskItem.closest(
      ".task-cell-container, .task-cell-mobile"
    );
    dragState.hasMoved = false;
  }

  function handleDragMove(e) {
    if (!dragState.taskElement) return;

    const deltaX = Math.abs(e.clientX - dragState.dragStartX);
    const deltaY = Math.abs(e.clientY - dragState.dragStartY);

    // Start drag if moved more than 5px
    if (!dragState.isDragging && (deltaX > 5 || deltaY > 5)) {
      dragState.isDragging = true;
      dragState.hasMoved = true;
      startDrag();
    }

    if (dragState.isDragging) {
      e.preventDefault();
      updateGhostPosition(e.clientX, e.clientY);

      // Find drop target
      const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
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

      const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
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
// CELL SELECTION DRAG (for creating tasks with date ranges)
// ============================================================================

function handleCellDragStart(e) {
  // Only handle empty cells or cells with add-task-btn
  const emptyCell = e.target.closest(".empty-task-cell");
  const cellContainer = e.target.closest(".task-cell-container");

  // Don't start if clicking on a task item or add task button
  if (e.target.closest(".task-item") || e.target.closest(".add-task-btn")) {
    return;
  }

  // Only start if it's an empty cell or a task-cell-container
  if (!emptyCell && !cellContainer) {
    return;
  }

  const cell = emptyCell || cellContainer;
  if (!cell || currentView !== "board") return;

  // Get the row to ensure we stay within it
  const row = cell.closest("tr");
  if (!row) return;

  cellDragState.dragStartX = e.clientX;
  cellDragState.dragStartY = e.clientY;
  cellDragState.startCell = cell;
  cellDragState.startRow = row;
  cellDragState.currentCell = cell;
}

function handleCellDragMove(e) {
  if (!cellDragState.startCell) return;

  const deltaX = Math.abs(e.clientX - cellDragState.dragStartX);
  const deltaY = Math.abs(e.clientY - cellDragState.dragStartY);

  // Start drag if moved more than 5px horizontally
  if (!cellDragState.isDragging && deltaX > 5 && deltaX > deltaY) {
    cellDragState.isDragging = true;
    startCellDrag();
  }

  if (cellDragState.isDragging) {
    e.preventDefault();

    // Find cell under cursor
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    const cellBelow = elementBelow?.closest(
      ".task-cell-container, .empty-task-cell"
    );

    // Make sure it's in the same row
    if (cellBelow && cellBelow.closest("tr") === cellDragState.startRow) {
      if (cellBelow !== cellDragState.currentCell) {
        updateCellSelection(cellBelow);
        cellDragState.currentCell = cellBelow;
      }
    }
  }
}

function handleCellDragEnd(e) {
  if (!cellDragState.startCell) return;

  if (cellDragState.isDragging) {
    e.preventDefault();
    e.stopPropagation();

    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    const endCell = elementBelow?.closest(
      ".task-cell-container, .empty-task-cell"
    );

    // Make sure end cell is in the same row
    if (
      endCell &&
      endCell.closest("tr") === cellDragState.startRow &&
      endCell !== cellDragState.startCell
    ) {
      // Get user ID and day names
      const userId = cellDragState.startCell.dataset.userId;
      const startDayName = cellDragState.startCell.dataset.dayName;
      const endDayName = endCell.dataset.dayName;

      // Open create modal with date range preselected
      openCreateModalWithDateRange(userId, startDayName, endDayName);
    }

    endCellDrag();
  }

  // Reset cell drag state
  cellDragState = {
    isDragging: false,
    startCell: null,
    currentCell: null,
    startRow: null,
    dragStartX: 0,
    dragStartY: 0,
  };
}

function startCellDrag() {
  // Add visual feedback
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  // Highlight start cell
  if (cellDragState.startCell) {
    cellDragState.startCell.classList.add("cell-drag-active");
  }

  // Add CSS for cell selection
  const style = document.createElement("style");
  style.id = "cell-drag-styles";
  style.textContent = `
    .cell-drag-active {
      background-color: rgba(79, 70, 229, 0.15) !important;
      border: 2px solid #4f46e5 !important;
    }
    .cell-drag-range {
      background-color: rgba(79, 70, 229, 0.1) !important;
    }
  `;
  document.head.appendChild(style);
}

function updateCellSelection(newCell) {
  // Clear previous range highlighting
  document.querySelectorAll(".cell-drag-range").forEach((cell) => {
    cell.classList.remove("cell-drag-range");
  });

  // Get all cells in the row
  const row = cellDragState.startRow;
  const cells = Array.from(
    row.querySelectorAll(".task-cell-container, .empty-task-cell")
  );

  const startIndex = cells.indexOf(cellDragState.startCell);
  const endIndex = cells.indexOf(newCell);

  // Highlight range
  const minIndex = Math.min(startIndex, endIndex);
  const maxIndex = Math.max(startIndex, endIndex);

  for (let i = minIndex; i <= maxIndex; i++) {
    if (cells[i] && cells[i] !== cellDragState.startCell) {
      cells[i].classList.add("cell-drag-range");
    }
  }
}

function endCellDrag() {
  // Remove visual feedback
  document.body.style.cursor = "";
  document.body.style.userSelect = "";

  // Remove highlighting
  document
    .querySelectorAll(".cell-drag-active, .cell-drag-range")
    .forEach((cell) => {
      cell.classList.remove("cell-drag-active", "cell-drag-range");
    });

  // Remove style
  const style = document.getElementById("cell-drag-styles");
  if (style) style.remove();
}

const openCreateModalWithDateRange = (userId, startDayName, endDayName) => {
  openModalFromApi(
    window.CREATE_MODAL_TITLE || "Neue Aufgabe erstellen",
    "/api/modal/task-create",
    () => {
      // Load templates into dropdown
      loadTemplatesIntoSelector();

      // Preselect user
      const userSelect = byId("userId");
      if (userSelect && userId) {
        userSelect.value = userId;
      }

      // Calculate dates from day names
      const startDateStr = getDateFromDayName(startDayName, currentWeekOffset);
      const endDateStr = getDateFromDayName(endDayName, currentWeekOffset);

      // Ensure dates are in correct order (start <= end)
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const finalStartDate = startDate <= endDate ? startDateStr : endDateStr;
      const finalEndDate = startDate <= endDate ? endDateStr : startDateStr;

      const startDateInput = byId("startDate");
      const endDateInput = byId("endDate");

      if (startDateInput && finalStartDate) {
        startDateInput.value = finalStartDate;
      }

      if (endDateInput && finalEndDate) {
        endDateInput.value = finalEndDate;
      }

      // Setup template selector change handler
      setupTemplateSelector();

      setupDateValidation();
    }
  );
};

// ============================================================================
// UNASSIGNED TASK MODAL
// ============================================================================

const showUnassignedTaskModal = (taskData) => {
  const t = window.taskTranslations || {};
  const startDateFormatted = formatDate(taskData.startDate);
  const endDateFormatted = taskData.endDate
    ? formatDate(taskData.endDate)
    : "N/A";

  const priorityLabels = {
    high: t.contextMenuPriorityHigh || "High",
    medium: t.contextMenuPriorityMedium || "Medium",
    low: t.contextMenuPriorityLow || "Low",
  };

  const statusLabels = {
    pending: "Pending",
    "in-progress": "In Progress",
    completed: "Completed",
  };

  const modalHtml = `
    <div class="p-6">
      <div class="mb-6">
        <h3 class="text-2xl font-bold text-gray-900 mb-2">${
          taskData.taskName
        }</h3>
        <div class="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <i class="fas fa-user-times mr-1"></i>
            ${t.unassigned || "Unassigned"}
          </span>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ${statusLabels[taskData.taskStatus] || taskData.taskStatus}
          </span>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            taskData.taskPriority === "high"
              ? "bg-red-100 text-red-800"
              : taskData.taskPriority === "medium"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-green-100 text-green-800"
          }">
            <i class="fas ${
              taskData.taskPriority === "high"
                ? "fa-exclamation-circle"
                : taskData.taskPriority === "medium"
                ? "fa-exclamation-triangle"
                : "fa-info-circle"
            } mr-1"></i>
            ${priorityLabels[taskData.taskPriority] || taskData.taskPriority}
          </span>
        </div>
      </div>
      
      <div class="mb-6 space-y-3">
        <div class="flex items-start gap-3">
          <i class="fas fa-align-left text-gray-400 mt-1"></i>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-700 mb-1">Description</div>
            <div class="text-sm text-gray-600">${
              taskData.taskDesc || "No description provided"
            }</div>
          </div>
        </div>
        
        <div class="flex items-start gap-3">
          <i class="fas fa-calendar text-gray-400 mt-1"></i>
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-700 mb-1">${
              t.dateRange || "Date Range"
            }</div>
            <div class="text-sm text-gray-600">${startDateFormatted} - ${endDateFormatted}</div>
          </div>
        </div>
      </div>
      
      <div class="border-t border-gray-200 pt-4 mt-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div class="flex items-start gap-3">
            <i class="fas fa-info-circle text-blue-600 mt-1"></i>
            <div class="flex-1 text-sm text-blue-800">
              ${
                t.assignToYourselfMessage ||
                "You can assign this task to yourself or close this dialog to leave it unassigned."
              }
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 justify-end">
          <button id="cancel-assign-btn" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition font-medium">
            ${t.cancel || "Cancel"}
          </button>
          <button id="assign-to-me-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition font-medium flex items-center gap-2">
            <i class="fas fa-user-check"></i>
            ${t.assignToMe || "Assign to Me"}
          </button>
        </div>
      </div>
    </div>
  `;

  openModal(t.unassignedTaskDetails || "Unassigned Task Details", modalHtml);

  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    const cancelBtn = byId("cancel-assign-btn");
    const assignBtn = byId("assign-to-me-btn");

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        closeModal();
      };
    }

    if (assignBtn) {
      assignBtn.onclick = async () => {
        assignBtn.disabled = true;
        const originalText = assignBtn.innerHTML;
        assignBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${
          t.assigning || "Assigning..."
        }`;
        const success = await assignTaskToCurrentUser(
          taskData.taskId,
          taskData
        );
        if (success) {
          closeModal();
        } else {
          assignBtn.disabled = false;
          assignBtn.innerHTML = originalText;
        }
      };
    }
  }, 100);
};

const assignTaskToCurrentUser = async (taskId, taskData) => {
  try {
    // Get current user ID from the page (we can get it from any user cell or we'll fetch it)
    // For now, we'll get it from the server by making the update with null userId (server will set current user)
    const response = await fetch("/api/user/current");
    const userData = await response.json();

    if (!userData.ok || !userData.data || !userData.data._id) {
      alert("Could not determine current user");
      return false;
    }

    const currentUserId = userData.data._id;

    const payload = {
      userId: currentUserId,
      taskName: taskData.taskName,
      taskDescription: taskData.taskDesc || "",
      taskPriority: taskData.taskPriority,
      taskStatus: taskData.taskStatus,
      startDate: taskData.startDate,
      endDate: taskData.endDate || null,
    };

    const { ok, data } = await api(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (ok) {
      // Wait a bit to ensure database transaction is committed
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Reload the current view
      if (currentView === "board") {
        await loadWeekData(currentWeekOffset);
      } else {
        await loadListView(currentWeekOffset);
      }
      return true;
    } else {
      alert(data.msg || "Failed to assign task");
      return false;
    }
  } catch (err) {
    console.error("Error assigning task:", err);
    alert("Network error while assigning task");
    return false;
  }
};

// ============================================================================
// MODAL HANDLERS
// ============================================================================

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

/**
 * Load templates from the API and populate the template selector dropdown
 */
async function loadTemplatesIntoSelector() {
  const templateSelector = byId("templateSelector");
  if (!templateSelector) return;

  try {
    const response = await api("/api/task-templates");
    if (response && response.ok && response.data.templates) {
      const templates = response.data.templates;

      // Clear existing options except the first one (no template)
      templateSelector.innerHTML =
        '<option value="">-- No Template --</option>';

      // Add template options
      templates.forEach((template) => {
        const option = document.createElement("option");
        option.value = template._id;
        option.textContent = template.templateName;
        templateSelector.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading templates:", error);
  }
}

/**
 * Setup the template selector change handler
 */
function setupTemplateSelector() {
  const templateSelector = byId("templateSelector");
  if (!templateSelector) return;

  templateSelector.addEventListener("change", async (e) => {
    const templateId = e.target.value;
    if (!templateId) return;

    try {
      const response = await api(`/api/task-templates/${templateId}`);
      if (response && response.ok && response.data.template) {
        const template = response.data.template;

        // Fill form with template values
        const taskNameInput = byId("taskName");
        const taskPriorityInput = byId("taskPriority");
        const taskDescriptionInput = byId("taskDescription");
        const startDateInput = byId("startDate");
        const endDateInput = byId("endDate");

        if (taskNameInput) taskNameInput.value = template.taskName;
        if (taskPriorityInput) taskPriorityInput.value = template.taskPriority;
        if (taskDescriptionInput)
          taskDescriptionInput.value = template.taskDescription || "";

        // If template has defaultDuration and startDate is set, calculate endDate
        if (
          template.defaultDuration &&
          startDateInput &&
          startDateInput.value
        ) {
          const startDate = new Date(startDateInput.value);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + template.defaultDuration);

          if (endDateInput) {
            const year = endDate.getFullYear();
            const month = String(endDate.getMonth() + 1).padStart(2, "0");
            const day = String(endDate.getDate()).padStart(2, "0");
            endDateInput.value = `${year}-${month}-${day}`;
          }
        }
      }
    } catch (error) {
      console.error("Error loading template:", error);
    }
  });
}

const openCreateModalWithPreselect = (userId, dayName) => {
  openModalFromApi(
    window.CREATE_MODAL_TITLE || "Neue Aufgabe erstellen",
    "/api/modal/task-create",
    () => {
      // Load templates into dropdown
      loadTemplatesIntoSelector();

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

      // Setup template selector change handler
      setupTemplateSelector();

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
        () => {
          loadTemplatesIntoSelector();
          setupTemplateSelector();
          setupDateValidation();
        }
      );
    });
  }

  // Initialize task item listeners
  reattachTaskListeners();

  // Initialize hover highlighting for multi-day tasks
  initTaskHoverHighlight();

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
