const modal = document.getElementById("assign-modal");
const taskIdInput = document.getElementById("modal-task-id");
const taskNameSpan = document.getElementById("modal-task-name");
const userSelect = document.getElementById("user-select");
const form = document.getElementById("assign-form");
const messageDiv = document.getElementById("modal-message");
const assignBtn = document.getElementById("assign-btn");

function openAssignModal(taskId, taskName) {
  taskIdInput.value = taskId;
  taskNameSpan.textContent = taskName;
  userSelect.value = ""; // Auswahl zurücksetzen
  messageDiv.textContent = "";
  messageDiv.classList.add("hidden");
  assignBtn.disabled = false;
  assignBtn.textContent = "Task zuweisen";
  modal.classList.remove("hidden");
  modal.classList.add("flex"); // Zeigt das Modal an
}

function closeAssignModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// Schließe das Modal, wenn außerhalb geklickt wird
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeAssignModal();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const taskId = taskIdInput.value;
  const userId = userSelect.value;

  if (!userId) {
    alert("Bitte wähle einen Mitarbeiter aus.");
    return;
  }

  messageDiv.classList.remove("hidden", "text-green-600", "text-red-600");
  messageDiv.classList.add("text-blue-600");
  messageDiv.textContent = "Zuweisung wird verarbeitet...";
  assignBtn.disabled = true;
  assignBtn.textContent = "Wird zugewiesen...";

  try {
    const response = await fetch("/task-backlog/assign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskId, userId }),
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.classList.replace("text-blue-600", "text-green-600");
      messageDiv.textContent = data.msg || "Task erfolgreich zugewiesen!";

      // Modal nach kurzer Verzögerung schließen und Seite neu laden
      setTimeout(() => {
        closeAssignModal();
        window.location.reload();
      }, 1500);
    } else {
      messageDiv.classList.replace("text-blue-600", "text-red-600");
      messageDiv.textContent = data.msg || "Fehler bei der Zuweisung.";
      assignBtn.disabled = false;
      assignBtn.textContent = "Erneut versuchen";
    }
  } catch (error) {
    console.error("Fetch Fehler:", error);
    messageDiv.classList.replace("text-blue-600", "text-red-600");
    messageDiv.textContent = "Ein Netzwerkfehler ist aufgetreten.";
    assignBtn.disabled = false;
    assignBtn.textContent = "Erneut versuchen";
  }
});
