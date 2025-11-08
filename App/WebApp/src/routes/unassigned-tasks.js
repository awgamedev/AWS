const express = require("express");
const router = express.Router();
const Task = require("../models/Task"); // Importiere dein Task-Model
const User = require("../models/User"); // Nimm an, dass ein User-Model existiert
const generateLayout = require("../utils/layout");
const { ensureAuthenticated } = require("../middleware/auth");

// Hilfsfunktion zur Zuweisung von Prioritätsfarben für Tailwind
const getPriorityColor = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-500 text-white";
    case "medium":
      return "bg-yellow-500 text-gray-800";
    case "low":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-300 text-gray-800";
  }
};

// 📋 GET Route: Task Backlog anzeigen (/task-backlog)
// Listet nicht zugewiesene Tasks, sortiert nach Priorität, auf.
router.get("/task-backlog", ensureAuthenticated, async (req, res) => {
  let backlogTasks = [];
  let users = [];

  try {
    // Logik für die Sortierung nach Priorität
    const priorityOrder = { high: 1, medium: 2, low: 3 };

    // 1. Nicht zugewiesene Tasks abrufen (userId: null oder undefined)
    backlogTasks = await Task.find({ userId: { $in: [null, undefined] } })
      .lean() // Gibt reine JS-Objekte zurück, was schneller ist
      .exec();

    // 2. Sortieren im Code nach der definierten Reihenfolge: High, Medium, Low
    backlogTasks.sort((a, b) => {
      return priorityOrder[a.taskPriority] - priorityOrder[b.taskPriority];
    });

    // 3. Alle Benutzer abrufen, um sie im Modal zur Auswahl anzubieten
    // Passe dies an dein tatsächliches User-Model an (z.B. User.find({}).select('id name')).
    users = await User.find({}).select("_id name").lean().exec();
  } catch (error) {
    console.error("Fehler beim Abrufen des Task Backlogs:", error.message);
    // Setze eine leere Liste im Fehlerfall
    backlogTasks = [];
    users = [];
  }

  // --- HTML-Content für die Task-Liste ---
  const taskListHtml =
    backlogTasks.length > 0
      ? backlogTasks
          .map((task) => {
            const priorityClass = getPriorityColor(task.taskPriority);
            const dateStr = task.startDate.toLocaleDateString("de-DE");

            // Verwende data-Attribute, um Task-Details für JavaScript zu speichern
            return `
                <li class="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                    data-task-id="${task._id}"
                    data-task-name="${task.taskName}"
                    onclick="openAssignModal('${task._id}', '${
              task.taskName
            }')">
                    
                    <div class="flex-grow">
                        <p class="text-lg font-semibold text-gray-800">${
                          task.taskName
                        }</p>
                        <p class="text-sm text-gray-500 mt-1">${
                          task.taskDescription || "Keine Beschreibung"
                        }</p>
                    </div>
                    
                    <div class="flex items-center space-x-4 flex-shrink-0">
                        <span class="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${priorityClass}">
                            ${
                              task.taskPriority.charAt(0).toUpperCase() +
                              task.taskPriority.slice(1)
                            }
                        </span>
                        <span class="text-sm text-gray-500">${dateStr}</span>
                        <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                    </div>
                </li>
            `;
          })
          .join("")
      : '<li class="p-4 text-center text-gray-500">Glückwunsch! Alle Tasks sind zugewiesen.</li>';

  // --- HTML-Content für das Benutzer-Dropdown im Modal ---
  const userOptionsHtml = users
    .map(
      (user) => `<option value="${user._id}">${user.name || user._id}</option>`
    )
    .join("");

  const content = `
        <h1 class="text-3xl font-bold text-gray-900 mb-8">🛠️ Task Backlog (Nicht zugewiesen)</h1>

        <div class="bg-white p-6 rounded-xl shadow-2xl">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Offene Tasks (Sortiert nach Priorität)</h2>
            
            <ul class="divide-y divide-gray-100">
                ${taskListHtml}
            </ul>
        </div>
        
        <div id="assign-modal" class="fixed inset-0 bg-gray-600 bg-opacity-75 hidden items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-lg w-full m-4">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-2xl font-bold text-gray-900">Task zuweisen</h3>
                        <button onclick="closeAssignModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <p class="text-gray-600 mb-4">Task: <span id="modal-task-name" class="font-medium text-gray-800"></span></p>

                    <form id="assign-form">
                        <input type="hidden" id="modal-task-id" name="taskId">
                        
                        <div class="mb-4">
                            <label for="user-select" class="block text-sm font-medium text-gray-700 mb-2">Mitarbeiter auswählen:</label>
                            <select id="user-select" name="userId" required
                                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                                <option value="" disabled selected>-- Bitte wählen --</option>
                                ${userOptionsHtml}
                            </select>
                        </div>

                        <button type="submit" id="assign-btn" 
                            class="w-full bg-blue-600 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150">
                            Task zuweisen
                        </button>
                        <p id="modal-message" class="mt-3 text-center text-sm font-medium hidden"></p>
                    </form>
                </div>
            </div>
        </div>

        <script>
            const modal = document.getElementById('assign-modal');
            const taskIdInput = document.getElementById('modal-task-id');
            const taskNameSpan = document.getElementById('modal-task-name');
            const userSelect = document.getElementById('user-select');
            const form = document.getElementById('assign-form');
            const messageDiv = document.getElementById('modal-message');
            const assignBtn = document.getElementById('assign-btn');

            function openAssignModal(taskId, taskName) {
                taskIdInput.value = taskId;
                taskNameSpan.textContent = taskName;
                userSelect.value = ""; // Auswahl zurücksetzen
                messageDiv.textContent = "";
                messageDiv.classList.add('hidden');
                assignBtn.disabled = false;
                assignBtn.textContent = 'Task zuweisen';
                modal.classList.remove('hidden');
                modal.classList.add('flex'); // Zeigt das Modal an
            }

            function closeAssignModal() {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            
            // Schließe das Modal, wenn außerhalb geklickt wird
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeAssignModal();
                }
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const taskId = taskIdInput.value;
                const userId = userSelect.value;

                if (!userId) {
                    alert('Bitte wähle einen Mitarbeiter aus.');
                    return;
                }

                messageDiv.classList.remove('hidden', 'text-green-600', 'text-red-600');
                messageDiv.classList.add('text-blue-600');
                messageDiv.textContent = 'Zuweisung wird verarbeitet...';
                assignBtn.disabled = true;
                assignBtn.textContent = 'Wird zugewiesen...';

                try {
                    const response = await fetch('/task-backlog/assign', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ taskId, userId }),
                    });

                    const data = await response.json();

                    if (response.ok) {
                        messageDiv.classList.replace('text-blue-600', 'text-green-600');
                        messageDiv.textContent = data.msg || 'Task erfolgreich zugewiesen!';
                        
                        // Modal nach kurzer Verzögerung schließen und Seite neu laden
                        setTimeout(() => {
                            closeAssignModal();
                            window.location.reload(); 
                        }, 1500); 
                    } else {
                        messageDiv.classList.replace('text-blue-600', 'text-red-600');
                        messageDiv.textContent = data.msg || 'Fehler bei der Zuweisung.';
                        assignBtn.disabled = false;
                        assignBtn.textContent = 'Erneut versuchen';
                    }

                } catch (error) {
                    console.error('Fetch Fehler:', error);
                    messageDiv.classList.replace('text-blue-600', 'text-red-600');
                    messageDiv.textContent = 'Ein Netzwerkfehler ist aufgetreten.';
                    assignBtn.disabled = false;
                    assignBtn.textContent = 'Erneut versuchen';
                }
            });

        </script>
    `;

  // Sende das generierte Layout zurück
  res.send(generateLayout("Task Backlog", content, req.path, req.user));
});

// 📅 POST Route: Task einem Benutzer zuweisen (/task-backlog/assign)
router.post("/task-backlog/assign", ensureAuthenticated, async (req, res) => {
  try {
    const { taskId, userId } = req.body;

    // Einfache Validierung
    if (!taskId || !userId) {
      return res.status(400).json({ msg: "Fehlende Task- oder Benutzer-ID." });
    }

    // Finde den Task und aktualisiere die userId und modified-Felder
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        userId: userId,
        modifiedAt: Date.now(),
        modifiedBy: req.user.name || req.user.id, // Nehme an, req.user hat 'name' oder 'id'
        taskStatus: "pending", // Setze den Status bei Zuweisung auf 'pending'
      },
      { new: true } // Gibt das aktualisierte Dokument zurück
    );

    if (!updatedTask) {
      return res.status(404).json({ msg: "Task nicht gefunden." });
    }

    // Erfolgreiche Antwort
    res.status(200).json({
      msg: `Task '${updatedTask.taskName}' wurde erfolgreich zugewiesen.`,
      task: updatedTask,
    });
  } catch (err) {
    console.error("Fehler bei der Task-Zuweisung:", err.message);
    res.status(500).json({ msg: "Serverfehler bei der Task-Zuweisung." });
  }
});

module.exports = router;
