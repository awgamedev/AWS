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
    users = await User.find({}).select("id name").lean();

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
                <td class="p-3 border border-gray-200 font-semibold sticky left-0 bg-white shadow-sm w-40">${user.name}</td>
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

module.exports = router;
