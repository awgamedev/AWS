const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User");
const { ensureAuthenticated } = require("../middleware/auth");
const taskController = require("../controllers/taskController");
const { renderView } = require("../utils/view-renderer"); // Angenommen, du hast eine renderView-Funktion wie in tasks.js

// Hilfsfunktion: Fügt Tage zu einem Datum hinzu
const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + days);
  return newDate;
};

// Hilfsfunktion: Ermittelt den Start der Woche (Montag)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  // Passe den Tag an, sodass 0 = Sonntag, 1 = Montag, ..., 6 = Samstag.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 📅 GET Route: Aufgabenboard anzeigen (/task-list)
router.get("/task-list", ensureAuthenticated, async (req, res) => {
  let users = [];
  let tasksByDayAndUser = {};
  const title = req.__("TASK_BOARD_PAGE_TITLE") || "Aufgabenboard";
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
    const tasks = await Task.find({
      $or: [
        // Startdatum vor Ende der Woche (nächster Montag)
        { startDate: { $lt: endOfDisplayedWeek } },
        { endDate: null, startDate: { $lt: endOfDisplayedWeek } },
      ],
      $or: [
        // Enddatum nach oder am Start der Woche (Montag)
        { endDate: { $gte: startOfWeek } },
        { endDate: null },
      ],
    })
      .select(
        "userId taskName taskStatus startDate endDate taskDescription taskPriority"
      )
      .lean();

    // 3. Aufgaben den Tagen und Mitarbeitern zuordnen (LOGIK UNVERÄNDERT)
    tasks.forEach((task) => {
      const userId = task.userId?.toString() || "";
      task.assignedUsername = userMap[userId] || "Unbekannt";

      const loopStartDate = new Date(
        Math.max(startOfWeek.getTime(), task.startDate.getTime())
      );
      loopStartDate.setHours(0, 0, 0, 0);

      const taskEndDate = task.endDate
        ? new Date(task.endDate)
        : endOfWeekDisplay;

      const loopEndDate = new Date(
        Math.min(endOfWeekDisplay.getTime(), taskEndDate.getTime())
      );

      let currentDate = loopStartDate;

      while (currentDate.getTime() <= loopEndDate.getTime()) {
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
        currentDate.setHours(0, 0, 0, 0);
      }
    });
  } catch (error) {
    req.logger.error("Fehler beim Abrufen des Aufgabenboards:", error); // console.error durch logger ersetzen
    // *** Fehlerseite rendern statt req.flash und leeren Array ***
    return renderView(
      req,
      res,
      "error_message",
      req.__("ERROR_TITLE") || "Fehler",
      {
        message:
          req.__("TASK_LOAD_ERROR") ||
          "Fehler beim Laden der Aufgaben. Bitte versuchen Sie es später erneut.",
      },
      "",
      500
    );
  }

  const weekStartFormat = startOfWeek.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const weekEndDisplay = addDays(startOfWeek, 6);
  const weekEndFormat = weekEndDisplay.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // 4. View über die Helferfunktion rendern
  renderView(req, res, "tasks/task_board", title, {
    users: users,
    tasksByDayAndUser: tasksByDayAndUser,
    daysOfWeek: daysOfWeek,
    weekRange: `${weekStartFormat} - ${weekEndFormat}`,
    // Der __-Local ist jetzt automatisch in renderView enthalten
  });
});

// POST Route: Eine neue Aufgabe erstellen (API)
router.post("/api/tasks", ensureAuthenticated, taskController.createTask);

// PUT Route: Eine bestehende Aufgabe aktualisieren (API)
router.put("/api/tasks/:id", ensureAuthenticated, taskController.updateTask);

// DELETE Route: Eine Aufgabe löschen (API)
router.delete("/api/tasks/:id", ensureAuthenticated, taskController.deleteTask);

module.exports = router;
