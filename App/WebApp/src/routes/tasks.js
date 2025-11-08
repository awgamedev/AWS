const express = require("express");
const router = express.Router();
const Task = require("../models/Task"); // Dein Task-Model
const User = require("../models/User"); // Annahme: Dein User-Model
const generateLayout = require("../utils/layout"); // Deine Layout-Funktion
const { ensureAuthenticated } = require("../middleware/auth"); // Deine Authentifizierungs-Middleware

// Hilfsfunktion: Gibt das Datum des Montags (Start der Woche) zurück
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  // Passe den Tag an, sodass 0 = Sonntag, 1 = Montag, ..., 6 = Samstag.
  // Wir wollen Montag (1) als Start der Woche.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0); // Setze die Zeit auf 00:00:00.000
  return d;
};

const generateTaskModal = (users) => {
  // Optionen für das Mitarbeiter-Dropdown
  const userOptions = users
    .map((user) => `<option value="${user._id}">${user.username}</option>`)
    .join("");

  return `
        <div id="task-modal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center transition-opacity duration-300 ease-out">
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-transform duration-300 ease-out scale-95 opacity-0" id="task-modal-content">
                <div class="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 class="text-xl font-semibold text-gray-800">Neue Aufgabe zuweisen</h3>
                    <button id="close-task-modal" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <form id="create-task-form">
                    <div class="mb-4">
                        <label for="taskName" class="block text-sm font-medium text-gray-700">Aufgabenname *</label>
                        <input type="text" id="taskName" name="taskName" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    
                    <div class="mb-4">
                        <label for="userId" class="block text-sm font-medium text-gray-700">Mitarbeiter zuweisen *</label>
                        <select id="userId" name="userId" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                            <option value="">-- Wähle Mitarbeiter --</option>
                            ${userOptions}
                        </select>
                    </div>

                    <div class="mb-4">
                        <label for="taskDescription" class="block text-sm font-medium text-gray-700">Beschreibung</label>
                        <textarea id="taskDescription" name="taskDescription" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label for="startDate" class="block text-sm font-medium text-gray-700">Startdatum *</label>
                            <input type="date" id="startDate" name="startDate" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <div>
                            <label for="endDate" class="block text-sm font-medium text-gray-700">Fälligkeitsdatum (Optional)</label>
                            <input type="date" id="endDate" name="endDate" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                    </div>
                    
                    <div id="task-form-message" class="mb-4 text-sm font-medium text-center hidden"></div>

                    <div class="flex justify-end">
                        <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition duration-150 shadow-md">
                            Aufgabe speichern
                        </button>
                    </div>
                </form>
            </div>
        </div>
        `;
};

// 📅 GET Route: Aufgabenboard anzeigen (/tasks)
router.get("/tasks", ensureAuthenticated, async (req, res) => {
  let users = [];
  let tasksByDayAndUser = {};
  const daysOfWeek = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];

  // Ermittle den Start der aktuellen Woche (Montag)
  const startOfWeek = getStartOfWeek(new Date());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7); // Ende der Woche (nächster Montag)

  try {
    // 1. Alle Mitarbeiter abrufen (oder nur die relevanten, je nach Anforderung)
    // ANNAHME: Das User-Model existiert und hat einen 'name'-Feld.
    users = await User.find({}).select("_id username").lean(); // Wichtig: username abrufen

    // 2. Alle Aufgaben für die aktuelle Woche abrufen
    const tasks = await Task.find({
      // Aufgaben, deren Startdatum in dieser Woche liegt
      startDate: { $gte: startOfWeek, $lt: endOfWeek },
    })
      .select("userId taskName taskStatus startDate")
      .lean();

    // 3. Aufgaben den Tagen und Mitarbeitern zuordnen
    tasks.forEach((task) => {
      // Finde den Wochentags-Index (0=So, 1=Mo, ..., 6=Sa). Wir wollen 0=Mo, ..., 6=So.
      let taskDate = new Date(task.startDate);
      // Korrigierter Index: (Wochentag - 1 + 7) % 7 --> Mo=0, ... So=6
      const dayIndex = (taskDate.getDay() - 1 + 7) % 7;
      const dayName = daysOfWeek[dayIndex];
      const userId = task.userId.toString();

      if (!tasksByDayAndUser[userId]) {
        tasksByDayAndUser[userId] = {};
      }
      if (!tasksByDayAndUser[userId][dayName]) {
        tasksByDayAndUser[userId][dayName] = [];
      }

      tasksByDayAndUser[userId][dayName].push(task);
    });
  } catch (error) {
    console.error("Fehler beim Abrufen des Aufgabenboards:", error.message);
    // Bei einem Fehler wird ein leeres Board angezeigt
  }

  // 4. HTML-Inhalt generieren
  const boardHtml = users
    .map((user) => {
      const userId = user._id.toString();
      const userTasks = tasksByDayAndUser[userId] || {};

      // Erstelle die Zellen für die 7 Wochentage
      const dayCells = daysOfWeek
        .map((dayName) => {
          const dayTasks = userTasks[dayName] || [];

          // Definiere die Tailwind-Klasse basierend auf dem Status
          const taskListHtml = dayTasks
            .map((task) => {
              let statusColor;
              switch (task.taskStatus) {
                case "completed":
                  statusColor = "bg-green-100 text-green-800 border-green-400";
                  break;
                case "in-progress":
                  statusColor =
                    "bg-yellow-100 text-yellow-800 border-yellow-400";
                  break;
                case "pending":
                default:
                  statusColor = "bg-red-100 text-red-800 border-red-400";
                  break;
              }

              return `
                    <div class="px-2 py-1 rounded-lg text-xs font-medium border my-1 ${statusColor}" title="${
                task.taskDescription || "Keine Beschreibung"
              }">
                        ${task.taskName} 
                        <span class="ml-1 text-gray-500 text-xs italic">(${
                          task.taskStatus
                        })</span>
                    </div>
                `;
            })
            .join("");

          return `
                <td class="p-2 border border-gray-200 align-top h-32">
                    ${taskListHtml}
                </td>
            `;
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

  const weekStartFormat = startOfWeek.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const weekEndDisplay = new Date(startOfWeek);
  weekEndDisplay.setDate(weekEndDisplay.getDate() + 6);
  const weekEndFormat = weekEndDisplay.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const content = `
        <h1 class="text-3xl font-bold text-gray-900 mb-2">🗓️ Aufgabenboard</h1>
        <p class="text-lg text-gray-600 mb-6">Wochenansicht: ${weekStartFormat} - ${weekEndFormat}</p>

        <button id="open-task-modal" class="mb-6 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Aufgabe erstellen
        </button>
        <div class="overflow-x-auto bg-white rounded-xl shadow-lg">
            </div>

        ${generateTaskModal(users)} 
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const modal = document.getElementById('task-modal');
                const modalContent = document.getElementById('task-modal-content');
                const openButton = document.getElementById('open-task-modal');
                const closeButton = document.getElementById('close-task-modal');
                const form = document.getElementById('create-task-form');
                const messageDiv = document.getElementById('task-form-message');

                // 1. Modal öffnen/schließen Logik
                const openModal = () => {
                    modal.classList.remove('hidden');
                    // Füge Klassen für die Animation hinzu
                    setTimeout(() => {
                        modal.classList.remove('opacity-0');
                        modalContent.classList.remove('opacity-0', 'scale-95');
                        modalContent.classList.add('opacity-100', 'scale-100');
                    }, 10); // Kleine Verzögerung für Übergang
                };

                const closeModal = () => {
                    // Füge Klassen für die Animation hinzu
                    modal.classList.add('opacity-0');
                    modalContent.classList.add('opacity-0', 'scale-95');
                    modalContent.classList.remove('opacity-100', 'scale-100');
                    // Verstecke es nach der Animation
                    setTimeout(() => modal.classList.add('hidden'), 300);
                };

                openButton.addEventListener('click', openModal);
                closeButton.addEventListener('click', closeModal);
                // Schließen bei Klick außerhalb des Modals
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeModal();
                    }
                });

                // 2. Formular-Einreichung Logik
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    messageDiv.textContent = 'Aufgabe wird gespeichert...';
                    messageDiv.className = 'mb-4 text-sm font-medium text-center text-yellow-600 block';
                    
                    const formData = new FormData(form);
                    const taskData = Object.fromEntries(formData.entries());

                    try {
                        const response = await fetch('/api/tasks', { 
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(taskData),
                        });

                        const data = await response.json();

                        if (response.ok) {
                            messageDiv.textContent = data.msg || 'Aufgabe erfolgreich gespeichert!';
                            messageDiv.className = 'mb-4 text-sm font-medium text-center text-green-600 block';
                            
                            // Formular zurücksetzen und Board neu laden, um die neue Aufgabe anzuzeigen
                            form.reset();
                            setTimeout(() => {
                                closeModal();
                                window.location.reload(); 
                            }, 1000);
                            
                        } else {
                            // Fehler vom Server
                            messageDiv.textContent = data.msg || 'Fehler beim Speichern der Aufgabe.';
                            messageDiv.className = 'mb-4 text-sm font-medium text-center text-red-600 block';
                        }

                    } catch (error) {
                        console.error('Fetch Fehler:', error);
                        messageDiv.textContent = 'Ein Netzwerkfehler ist aufgetreten.';
                        messageDiv.className = 'mb-4 text-sm font-medium text-center text-red-600 block';
                    }
                });
            });
        </script>

        <div class="overflow-x-auto bg-white rounded-xl shadow-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr class="bg-gray-100">
                        <th class="p-3 border border-gray-200 text-left text-sm font-medium text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 shadow-sm w-40">Mitarbeiter</th>
                        ${daysOfWeek
                          .map(
                            (day) => `
                            <th class="p-3 border border-gray-200 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">${day}</th>
                        `
                          )
                          .join("")}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${
                      boardHtml.length > 0
                        ? boardHtml
                        : `
                        <tr>
                            <td colspan="8" class="text-center py-10 text-gray-500 italic">Keine Mitarbeiter oder Aufgaben gefunden.</td>
                        </tr>
                    `
                    }
                </tbody>
            </table>
        </div>
    `;

  // Sende das generierte Layout zurück
  res.send(generateLayout("Aufgabenboard", content, req.path, req.user));
});

router.post("/api/tasks", ensureAuthenticated, async (req, res) => {
  // Annahme: Die Daten kommen aus dem Frontend-Formular.
  const { userId, taskName, taskDescription, startDate, endDate } = req.body;

  // Standard-Felder, die automatisch gesetzt werden
  const createdBy = req.user.username || "Admin"; // Nimmt an, dass req.user.username existiert
  const modifiedBy = createdBy;

  // Einfache Validierung (kann nach Bedarf erweitert werden)
  if (!userId || !taskName || !startDate) {
    return res.status(400).json({
      msg: "Bitte geben Sie einen Mitarbeiter, einen Aufgabennamen und ein Startdatum an.",
    });
  }

  try {
    const newTask = new Task({
      userId,
      taskName,
      taskDescription: taskDescription || "", // Optionales Feld
      taskStatus: "pending", // Standardwert
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined, // Optionales Enddatum
      createdBy,
      modifiedBy,
    });

    const savedTask = await newTask.save();

    res.status(201).json({
      msg: "Aufgabe erfolgreich erstellt und zugewiesen.",
      task: savedTask,
    });
  } catch (err) {
    console.error("Fehler beim Erstellen der Aufgabe:", err.message);
    // MongoDB Validierungsfehler abfangen
    if (err.name === "ValidationError") {
      return res.status(400).json({
        msg: `Validierungsfehler: ${Object.values(err.errors)
          .map((e) => e.message)
          .join(", ")}`,
      });
    }
    res.status(500).json({ msg: "Serverfehler beim Speichern der Aufgabe." });
  }
});

module.exports = router;
