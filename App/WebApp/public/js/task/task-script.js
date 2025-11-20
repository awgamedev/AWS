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

let currentWeekOffset = window.CURRENT_WEEK_OFFSET || 0;

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

const getPriorityColorClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 border-red-400 hover:bg-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-400 hover:bg-yellow-200";
    case "low":
      return "bg-green-100 text-green-800 border-green-400 hover:bg-green-200";
    default:
      return "bg-gray-300 text-gray-800 border-gray-300 hover:bg-gray-400";
  }
};

const renderTaskItem = (task) => {
  const statusColor = getPriorityColorClass(task.taskPriority);
  return `
    <div 
      class="task-item px-2 py-1 rounded-lg text-xs font-medium border my-1 cursor-pointer transition duration-100 ${statusColor}" 
      data-task-id="${task._id}"
      data-user-id="${task.userId || ""}"
      data-task-name="${task.taskName}"
      data-task-desc="${task.taskDescription || ""}"
      data-task-status="${task.taskStatus}"
      data-task-priority="${task.taskPriority}"
      data-start-date="${task.startDate}"
      data-end-date="${task.endDate || ""}"
      title="Status: ${task.taskStatus} - Click to edit"
    >
      ${task.taskName} (${task.assignedUsername || "Unassigned"})
    </div>
  `;
};

const renderMobileTaskItem = (task) => {
  const statusColor = getPriorityColorClass(task.taskPriority);
  return `
    <div 
      class="task-item px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer transition duration-100 ${statusColor}" 
      data-task-id="${task._id}"
      data-user-id="${task.userId || ""}"
      data-task-name="${task.taskName}"
      data-task-desc="${task.taskDescription || ""}"
      data-task-status="${task.taskStatus}"
      data-task-priority="${task.taskPriority}"
      data-start-date="${task.startDate}"
      data-end-date="${task.endDate || ""}"
    >
      <div class="flex items-start justify-between">
        <span class="flex-1">${task.taskName}</span>
        <svg class="w-4 h-4 ml-2 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      </div>
      <div class="text-xs mt-1 opacity-75">
        ${task.assignedUsername || "Unassigned"}
      </div>
    </div>
  `;
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
    console.log(`Fetching week data for offset: ${offset}`);
    const response = await api(`/api/task-board/week?offset=${offset}`);
    console.log("API Response:", response);

    if (response && response.ok && response.data) {
      // The API function returns {ok, status, data} where data is the parsed JSON
      // Our API endpoint returns {ok: true, data: {...}} so we need response.data.data
      const weekData = response.data.data || response.data;
      console.log("Week data received:", weekData);
      updateTaskBoard(weekData);
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

const updateTaskBoard = (data) => {
  console.log("updateTaskBoard called with:", data);
  const { users, tasksByDayAndUser, daysOfWeek, weekRange } = data;
  console.log("Users:", users, "Days:", daysOfWeek);

  // Update week range display
  const weekRangeEl = byId("current-week-range");
  if (weekRangeEl) weekRangeEl.textContent = weekRange;

  // Update desktop table
  const desktopTable = document.querySelector(".hidden.md\\:block table tbody");
  if (desktopTable && users && users.length > 0) {
    desktopTable.innerHTML = users
      .map((user) => {
        const userId = user._id.toString();
        const dayCells = daysOfWeek
          .map((dayName) => {
            const dayTasks = tasksByDayAndUser[userId]?.[dayName] || [];
            const tasksHtml = dayTasks
              .map((task) => renderTaskItem(task))
              .join("");
            return `<td class="p-2 border border-gray-200 align-top h-2">${tasksHtml}</td>`;
          })
          .join("");

        return `
        <tr class="hover:bg-gray-50">
          <td class="p-3 border border-gray-200 font-semibold sticky left-0 bg-white shadow-sm w-40">${user.username}</td>
          ${dayCells}
        </tr>
      `;
      })
      .join("");
  } else if (desktopTable) {
    desktopTable.innerHTML =
      '<tr><td colspan="8" class="text-center py-10 text-gray-500 italic">No data found</td></tr>';
  }

  // Update mobile view
  const mobileView = document.querySelector(".md\\:hidden.space-y-4");
  if (mobileView && users && users.length > 0) {
    mobileView.innerHTML = users
      .map((user) => {
        const userId = user._id.toString();
        const daysHtml = daysOfWeek
          .map((dayName) => {
            const dayTasks = tasksByDayAndUser[userId]?.[dayName] || [];
            const tasksHtml =
              dayTasks.length > 0
                ? `<div class="space-y-2">${dayTasks
                    .map((task) => renderMobileTaskItem(task))
                    .join("")}</div>`
                : '<p class="text-xs text-gray-400 italic">No tasks</p>';

            return `
          <div class="p-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-gray-700 text-sm">${dayName}</h4>
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">${
                dayTasks.length
              } ${dayTasks.length === 1 ? "Task" : "Tasks"}</span>
            </div>
            ${tasksHtml}
          </div>
        `;
          })
          .join("");

        return `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <div class="bg-indigo-600 text-white px-4 py-3">
            <h3 class="font-bold text-lg">${user.username}</h3>
          </div>
          <div class="divide-y divide-gray-200">
            ${daysHtml}
          </div>
        </div>
      `;
      })
      .join("");
  } else if (mobileView) {
    mobileView.innerHTML =
      '<div class="bg-white rounded-xl shadow-lg p-8 text-center"><p class="text-gray-500 italic">No data found</p></div>';
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
