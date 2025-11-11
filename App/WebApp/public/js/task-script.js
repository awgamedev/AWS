// public/js/task-script.js
// KEINE EJS TAGS HIER!

document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------------------------------------------------
  // 1. SOFORTIGE KLICK-HANDLER (Wird ausgeführt, sobald der DOM geladen ist)
  // ----------------------------------------------------------------------

  // Listener für den "Aufgabe erstellen" Button
  const openTaskModalBtn = document.getElementById("open-task-modal");
  if (openTaskModalBtn) {
    openTaskModalBtn.addEventListener("click", () => {
      // Optionaler Test
      console.log("Button 'Aufgabe erstellen' geklickt!");

      window.dispatchEvent(
        new CustomEvent("open-modal", {
          detail: {
            // Verwendet die globalen Variablen aus der EJS-Brücke
            title: window.CREATE_MODAL_TITLE,
            content: window.CREATE_TASK_HTML,
          },
        })
      );
    });
  } else {
    console.error("Button 'open-task-modal' nicht gefunden!");
  }

  // Listener für den "Nicht zugewiesene Aufgaben" Button
  const unassignedTasksBtn = document.getElementById("unassigned-tasks-btn");
  if (unassignedTasksBtn) {
    unassignedTasksBtn.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("open-modal", {
          detail: {
            // Verwendet die globalen Variablen aus der EJS-Brücke
            title: window.EDIT_MODAL_TITLE,
            content: window.EDIT_TASK_STATIC_HTML,
          },
        })
      );
    });
  } else {
    console.error("Button 'unassigned-tasks-btn' nicht gefunden!");
  }

  // ----------------------------------------------------------------------
  // 2. RESTLICHE LOGIK (Unverändert)
  // ----------------------------------------------------------------------

  const dispatchCloseModal = () => {
    window.dispatchEvent(new CustomEvent("close-modal"));
  };

  // Event-Listener reagiert auf das Alpine-Öffnungs-Event, um den Submit-Handler zu binden
  document.addEventListener("open-modal", () => {
    setTimeout(() => {
      const currentForm = document.getElementById("create-task-form");

      if (currentForm && !currentForm._listenerAdded) {
        currentForm._listenerAdded = true;
        const messageDiv = document.getElementById("task-form-message");

        currentForm.addEventListener("submit", async (e) => {
          e.preventDefault();

          messageDiv.textContent = "Aufgabe wird gespeichert...";
          messageDiv.className =
            "mb-4 text-sm font-medium text-center text-yellow-600 block";

          const formData = new FormData(currentForm);
          const taskData = Object.fromEntries(formData.entries());

          if (taskData.userId === "") {
            taskData.userId = null;
          }

          try {
            const response = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(taskData),
            });

            const data = await response.json();

            if (response.ok) {
              messageDiv.textContent =
                data.msg || "Aufgabe erfolgreich gespeichert!";
              messageDiv.className =
                "mb-4 text-sm font-medium text-center text-green-600 block";
              currentForm.reset();

              setTimeout(() => {
                dispatchCloseModal();
                window.location.reload();
              }, 1000);
            } else {
              messageDiv.textContent =
                data.msg || "Fehler beim Speichern der Aufgabe.";
              messageDiv.className =
                "mb-4 text-sm font-medium text-center text-red-600 block";
            }
          } catch (error) {
            console.error("Fetch Fehler:", error);
            messageDiv.textContent = "Ein Netzwerkfehler ist aufgetreten.";
            messageDiv.className =
              "mb-4 text-sm font-medium text-center text-red-600 block";
          }
        });
      }
    }, 50);
  });

  // ... (Der restliche Code für Edit, PUT, DELETE, etc., folgt hier unverändert) ...

  // Listener für alle Aufgaben-Elemente (klicken)
  document.querySelectorAll(".task-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      const data = event.currentTarget.dataset;

      // 1. Öffnen des Edit-Modals mit dem statischen HTML-Template
      window.dispatchEvent(
        new CustomEvent("open-modal", {
          detail: {
            title: `Aufgabe bearbeiten: ${data.taskName}`,
            content: window.EDIT_TASK_STATIC_HTML,
          },
        })
      );

      // 2. Füllen der Formularfelder nach dem Öffnen (kurze Verzögerung)
      setTimeout(() => {
        document.getElementById("edit-taskId").value = data.taskId;
        document.getElementById("edit-taskName").value = data.taskName;
        document.getElementById("edit-taskStatus").value = data.taskStatus;
        document.getElementById("edit-taskPriority").value = data.taskPriority;
        document.getElementById("edit-userId").value = data.userId;
        document.getElementById("edit-taskDescription").value = data.taskDesc;
        document.getElementById("edit-startDate").value = data.startDate;
        document.getElementById("edit-endDate").value = data.endDate;

        const editMessageDiv = document.getElementById(
          "edit-task-form-message"
        );
        if (editMessageDiv) {
          editMessageDiv.className =
            "mb-4 text-sm font-medium text-center hidden";
          editMessageDiv.textContent = "";
        }
      }, 100);
    });
  });

  // Event Delegation für den Submit-Handler des Edit-Formulars (PUT)
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "edit-task-form") {
      e.preventDefault();

      const editForm = e.target;
      const editMessageDiv = document.getElementById("edit-task-form-message");
      const taskId = document.getElementById("edit-taskId").value;

      if (!taskId) {
        editMessageDiv.textContent = "Fehler: Aufgaben-ID nicht gefunden.";
        editMessageDiv.className =
          "mb-4 text-sm font-medium text-center text-red-600 block";
        return;
      }

      editMessageDiv.textContent = "Änderungen werden gespeichert...";
      editMessageDiv.className =
        "mb-4 text-sm font-medium text-center text-yellow-600 block";

      const formData = new FormData(editForm);
      const taskData = Object.fromEntries(formData.entries());

      if (taskData.userId === "") {
        taskData.userId = null;
      }

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        const data = await response.json();

        if (response.ok) {
          editMessageDiv.textContent =
            data.msg || "Aufgabe erfolgreich aktualisiert!";
          editMessageDiv.className =
            "mb-4 text-sm font-medium text-center text-green-600 block";
          setTimeout(() => {
            dispatchCloseModal();
            window.location.reload();
          }, 1000);
        } else {
          editMessageDiv.textContent =
            data.msg || "Fehler beim Aktualisieren der Aufgabe.";
          editMessageDiv.className =
            "mb-4 text-sm font-medium text-center text-red-600 block";
        }
      } catch (error) {
        console.error("Fetch Fehler (PUT):", error);
        editMessageDiv.textContent = "Ein Netzwerkfehler ist aufgetreten.";
        editMessageDiv.className =
          "mb-4 text-sm font-medium text-center text-red-600 block";
      }
    }
  });

  // Event Delegation für den Lösch-Button (DELETE)
  document.addEventListener("click", async (e) => {
    if (e.target.id === "delete-task-btn") {
      const editMessageDiv = document.getElementById("edit-task-form-message");
      const taskId = document.getElementById("edit-taskId").value;

      if (
        !taskId ||
        !confirm("Sind Sie sicher, dass Sie diese Aufgabe löschen möchten?")
      )
        return;

      editMessageDiv.textContent = "Aufgabe wird gelöscht...";
      editMessageDiv.className =
        "mb-4 text-sm font-medium text-center text-red-600 block";

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
        });
        const data = await response.json();

        if (response.ok) {
          editMessageDiv.textContent =
            data.msg || "Aufgabe erfolgreich gelöscht!";
          editMessageDiv.className =
            "mb-4 text-sm font-medium text-center text-green-600 block";
          setTimeout(() => {
            dispatchCloseModal();
            window.location.reload();
          }, 1000);
        } else {
          editMessageDiv.textContent =
            data.msg || "Fehler beim Löschen der Aufgabe.";
          editMessageDiv.className =
            "mb-4 text-sm font-medium text-center text-red-600 block";
        }
      } catch (error) {
        console.error("Fetch Delete Fehler:", error);
        editMessageDiv.textContent = "Netzwerkfehler beim Löschversuch.";
        editMessageDiv.className =
          "mb-4 text-sm font-medium text-center text-red-600 block";
      }
    }
  });

  // NAVIGATION: Unassigned Tasks Button
  const openTasksButton = document.getElementById("unassigned-tasks-btn");
  if (
    openTasksButton &&
    openTasksButton.getAttribute("data-action") === "navigate"
  ) {
    openTasksButton.addEventListener("click", () => {
      window.location.href = "/task-backlog";
    });
  }
});
