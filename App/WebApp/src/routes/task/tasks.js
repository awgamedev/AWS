const express = require("express");
const router = express.Router();
const Task = require("../../models/Task");
const User = require("../../models/User"); // Annahme: Dein User-Model
const generateLayout = require("../../utils/layout"); // Deine Layout-Funktion
const { ensureAuthenticated } = require("../../middleware/auth"); // Deine Authentifizierungs-Middleware
const taskController = require("../../controllers/taskController"); // NEU: Controller importieren
const {
  addDays,
  getStartOfWeek,
  generateTaskModal,
  generateEditTaskModal,
} = require("./task-utils");

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
  const endOfDisplayedWeek = addDays(startOfWeek, 7); // Nächster Montag, 00:00 Uhr

  // Wir brauchen das Enddatum der angezeigten Woche (Sonntag 23:59:59)
  const endOfWeekDisplay = addDays(startOfWeek, 6);
  endOfWeekDisplay.setHours(23, 59, 59, 999);

  try {
    // 1. Alle Mitarbeiter abrufen
    users = await User.find({}).select("_id username").lean();
    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user.username;
      return map;
    }, {});

    // 2. Alle Aufgaben abrufen, die diese Woche überschneiden:
    // Die Aufgabe beginnt VOR dem Ende der Woche ODER
    // Die Aufgabe endet (oder hat kein Ende) NACH dem Start der Woche.
    const tasks = await Task.find({
      $or: [
        // Aufgabe beginnt in oder vor dieser Woche UND endet in oder nach dieser Woche (oder hat kein Ende)
        { startDate: { $lt: endOfDisplayedWeek } },
        // Aufgabe hat kein Enddatum UND beginnt in oder vor dieser Woche
        { endDate: null, startDate: { $lt: endOfDisplayedWeek } },
      ],
      // UND Aufgabe endet NICHT vor dem Beginn der Woche (Wenn endDate existiert)
      $or: [
        { endDate: { $gte: startOfWeek } },
        { endDate: null }, // Aufgaben ohne Enddatum sind "ongoing" und sollten angezeigt werden
      ],
    })
      .select("userId taskName taskStatus startDate endDate taskDescription")
      .lean();

    // 3. NEUE LOGIK: Aufgaben den Tagen und Mitarbeitern zuordnen, die sie überschneiden
    tasks.forEach((task) => {
      const userId = task.userId.toString();
      task.assignedUsername = userMap[userId] || "Unbekannt";

      // Setze das tatsächliche Startdatum der Schleife auf den Montag der angezeigten Woche (oder Startdatum der Aufgabe, je nachdem was später ist)
      const loopStartDate = new Date(
        Math.max(startOfWeek.getTime(), task.startDate.getTime())
      );
      loopStartDate.setHours(0, 0, 0, 0); // Stelle sicher, dass die Zeit Mitternacht ist

      // Das Schleifen-Ende ist der Sonntag 23:59:59 dieser Woche (oder das Enddatum der Aufgabe, je nachdem was früher ist)
      const taskEndDate = task.endDate
        ? new Date(task.endDate)
        : endOfWeekDisplay;

      // Stelle sicher, dass das Enddatum maximal das Ende des Sonntags ist
      const loopEndDate = new Date(
        Math.min(endOfWeekDisplay.getTime(), taskEndDate.getTime())
      );

      let currentDate = loopStartDate;

      // Iteriere von loopStartDate bis loopEndDate
      while (currentDate.getTime() <= loopEndDate.getTime()) {
        // Korrigierter Index: (Wochentag - 1 + 7) % 7 --> Mo=0, ... So=6
        const dayIndex = (currentDate.getDay() - 1 + 7) % 7;
        const dayName = daysOfWeek[dayIndex];

        if (!tasksByDayAndUser[userId]) {
          tasksByDayAndUser[userId] = {};
        }
        if (!tasksByDayAndUser[userId][dayName]) {
          tasksByDayAndUser[userId][dayName] = [];
        }

        // Füge die Aufgabe dem jeweiligen Tag hinzu
        tasksByDayAndUser[userId][dayName].push(task);

        // Gehe zum nächsten Tag
        currentDate = addDays(currentDate, 1);
        currentDate.setHours(0, 0, 0, 0); // Setze die Zeit für den nächsten Tag zurück, um Fehler zu vermeiden
      }
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
                  statusColor =
                    "bg-green-100 text-green-800 border-green-400 hover:bg-green-200";
                  break;
                case "in-progress":
                  statusColor =
                    "bg-yellow-100 text-yellow-800 border-yellow-400 hover:bg-yellow-200";
                  break;
                case "pending":
                default:
                  statusColor =
                    "bg-red-100 text-red-800 border-red-400 hover:bg-red-200";
                  break;
              }

              // Füge data-Attribute hinzu, um die Aufgabe im JS leicht identifizieren zu können
              return `
                    <div 
                        class="task-item px-2 py-1 rounded-lg text-xs font-medium border my-1 cursor-pointer transition duration-100 ${statusColor}" 
                        data-task-id="${task._id}"
                        data-user-id="${task.userId}"
                        data-task-name="${task.taskName}"
                        data-task-desc="${task.taskDescription || ""}"
                        data-task-status="${task.taskStatus}"
                        data-start-date="${task.startDate
                          .toISOString()
                          .substring(0, 10)}"
                        data-end-date="${
                          task.endDate
                            ? task.endDate.toISOString().substring(0, 10)
                            : ""
                        }"
                        title="Status: ${
                          task.taskStatus
                        } - Klick zum Bearbeiten"
                    >
                        ${task.taskName} (${task.assignedUsername})
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

        <div class="flex space-x-4 mb-6">
            <button id="open-task-modal" class="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Aufgabe erstellen
            </button>

            <button id="unassigned-tasks-btn" class="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 flex items-center">
                Nicht zugewiesene Aufgaben
            </button>
        </div>

        <div class="overflow-x-auto bg-white rounded-xl shadow-lg">
        </div>

        ${generateTaskModal(users)} 
        ${generateEditTaskModal(users)}
        <script src="/js/task-script.js"></script>

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

// POST Route: Eine neue Aufgabe erstellen
// Pfad: POST /api/tasks
router.post("/api/tasks", ensureAuthenticated, taskController.createTask);

// PUT Route: Eine bestehende Aufgabe aktualisieren
// Pfad: PUT /api/tasks/:id
router.put("/api/tasks/:id", ensureAuthenticated, taskController.updateTask);

module.exports = router;
