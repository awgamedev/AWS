document.addEventListener("DOMContentLoaded", () => {
  // --- ERSTELLEN MODAL LOGIK ---
  const modal = document.getElementById("task-modal");
  const modalContent = document.getElementById("task-modal-content");
  const openButton = document.getElementById("open-task-modal");
  const closeButton = document.getElementById("close-task-modal");
  const form = document.getElementById("create-task-form");
  const messageDiv = document.getElementById("task-form-message");

  const openModal = () => {
    modal.classList.remove("hidden");
    setTimeout(() => {
      modal.classList.remove("opacity-0");
      modalContent.classList.remove("opacity-0", "scale-95");
      modalContent.classList.add("opacity-100", "scale-100");
      form.reset(); // Formular zurücksetzen beim Öffnen
      messageDiv.className = "mb-4 text-sm font-medium text-center hidden"; // Meldung ausblenden
    }, 10);
  };

  const closeModal = () => {
    modal.classList.add("opacity-0");
    modalContent.classList.add("opacity-0", "scale-95");
    modalContent.classList.remove("opacity-100", "scale-100");
    setTimeout(() => modal.classList.add("hidden"), 300);
  };

  openButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  }); // 2. Formular-Einreichung Logik (Erstellen)

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageDiv.textContent = "Aufgabe wird gespeichert...";
    messageDiv.className =
      "mb-4 text-sm font-medium text-center text-yellow-600 block";
    const formData = new FormData(form);
    const taskData = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (response.ok) {
        messageDiv.textContent = data.msg || "Aufgabe erfolgreich gespeichert!";
        messageDiv.className =
          "mb-4 text-sm font-medium text-center text-green-600 block";
        form.reset();
        setTimeout(() => {
          closeModal();
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
  }); // --- BEARBEITEN MODAL LOGIK ---

  const editModal = document.getElementById("edit-task-modal");
  const editModalContent = document.getElementById("edit-task-modal-content");
  const closeEditButton = document.getElementById("close-edit-task-modal");
  const deleteButton = document.getElementById("delete-task-btn"); // HINZUGEFÜGT: Button zum Löschen
  const editForm = document.getElementById("edit-task-form");
  const editMessageDiv = document.getElementById("edit-task-form-message"); // Funktion zum Schließen/Öffnen des Bearbeitungs-Modals

  const openEditModal = (taskData) => {
    // Fülle das Formular mit den Aufgaben-Daten
    document.getElementById("edit-taskId").value = taskData.id; // <-- WICHTIG: ID setzen
    document.getElementById("edit-taskName").value = taskData.taskName;
    document.getElementById("edit-taskStatus").value = taskData.taskStatus;
    document.getElementById("edit-userId").value = taskData.userId;
    document.getElementById("edit-taskDescription").value =
      taskData.taskDescription;
    document.getElementById("edit-startDate").value = taskData.startDate;
    document.getElementById("edit-endDate").value = taskData.endDate;
    editMessageDiv.className = "mb-4 text-sm font-medium text-center hidden";

    editModal.classList.remove("hidden");
    setTimeout(() => {
      editModal.classList.remove("opacity-0");
      editModalContent.classList.remove("opacity-0", "scale-95");
      editModalContent.classList.add("opacity-100", "scale-100");
    }, 10);
  };

  const closeEditModal = () => {
    editModal.classList.add("opacity-0");
    editModalContent.classList.add("opacity-0", "scale-95");
    editModalContent.classList.remove("opacity-100", "scale-100");
    setTimeout(() => editModal.classList.add("hidden"), 300);
  };

  closeEditButton.addEventListener("click", closeEditModal);
  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  }); // Listener für alle Aufgaben-Elemente

  document.querySelectorAll(".task-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      const data = event.currentTarget.dataset;
      openEditModal({
        id: data.taskId,
        taskName: data.taskName,
        userId: data.userId,
        taskDescription: data.taskDesc,
        taskStatus: data.taskStatus,
        startDate: data.startDate,
        endDate: data.endDate,
      });
    });
  }); // Formular-Einreichung für die Bearbeitung

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🚨 HIER DIE PRÜFUNG: Hole die ID aus dem versteckten Feld
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

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (response.ok) {
        editMessageDiv.textContent =
          data.msg || "Aufgabe erfolgreich aktualisiert!";
        editMessageDiv.className =
          "mb-4 text-sm font-medium text-center text-green-600 block";
        setTimeout(() => {
          closeEditModal();
          window.location.reload();
        }, 1000);
      } else {
        editMessageDiv.textContent =
          data.msg || "Fehler beim Aktualisieren der Aufgabe.";
        editMessageDiv.className =
          "mb-4 text-sm font-medium text-center text-red-600 block";
      }
    } catch (error) {
      console.error("Fetch Fehler:", error);
      editMessageDiv.textContent = "Ein Netzwerkfehler ist aufgetreten.";
      editMessageDiv.className =
        "mb-4 text-sm font-medium text-center text-red-600 block";
    }
  }); // 🚨 NEU: Lösch-Handler
  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
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
            closeEditModal();
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
    });
  } // 🚨 NEU: Lösch-Button im Edit-Modal verknüpfen
  if (deleteButton) {
    deleteButton.addEventListener("click", () => {
      // Der Klick wird im deleteButton Listener oben abgefangen
    });
  }
});
