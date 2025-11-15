const express = require("express");
const router = express.Router();
const Task = require("./task.model");
const User = require("../user/user.model");
const { ensureAuthenticated } = require("../../middleware/auth");
const taskController = require("./task.controller");
const { renderView } = require("../../utils/view-renderer");
const ejs = require("ejs"); // NEU: EJS importieren
const fs = require("fs"); // NEU: FS importieren
const path = require("path"); // NEU: Path importieren

// Hilfsfunktion: Fügt Tage zu einem Datum hinzu
const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + days);
  return newDate;
};

// Hilfsfunktion: Ermittelt den Start der Woche (Montag)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // Passe den Tag an, sodass 0 = Sonntag, 1 = Montag, ..., 6 = Samstag.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 📅 GET Route: Aufgabenboard anzeigen (/task-list)
router.get("/task-list", ensureAuthenticated, async (req, res) => {
  let users = [];
  let tasksByDayAndUser = {};
  const title = req.__("TASK_BOARD_PAGE_TITLE");
  const daysOfWeek = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ]; // Ermittle den Start der aktuellen Woche (Montag)

  const startOfWeek = getStartOfWeek(new Date());
  const endOfDisplayedWeek = addDays(startOfWeek, 7); // Wir brauchen das Enddatum der angezeigten Woche (Sonntag 23:59:59)

  const endOfWeekDisplay = addDays(startOfWeek, 6);
  endOfWeekDisplay.setHours(23, 59, 59, 999);

  try {
    // 1. Alle Mitarbeiter abrufen
    users = await User.find({}).select("_id username").lean();
    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user.username;
      return map;
    }, {}); // 2. Alle Aufgaben abrufen (Logik unverändert)

    const tasks = await Task.find({
      $or: [
        { startDate: { $lt: endOfDisplayedWeek } },
        { endDate: null, startDate: { $lt: endOfDisplayedWeek } },
      ],
      $or: [{ endDate: { $gte: startOfWeek } }, { endDate: null }],
    })
      .select(
        "userId taskName taskStatus startDate endDate taskDescription taskPriority"
      )
      .lean(); // 3. Aufgaben den Tagen und Mitarbeitern zuordnen (Logik unverändert)

    // ... (Ihre Aufgaben-Zuordnungslogik) ...
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

        tasksByDayAndUser[userId][dayName].push(task);

        currentDate = addDays(currentDate, 1);
        currentDate.setHours(0, 0, 0, 0);
      }
    });
  } catch (error) {
    req.logger.error("Fehler beim Abrufen des Aufgabenboards:", error);
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
  } // --- NEUE LOGIK: Modals VOR-RENDERN --- // Verwenden Sie path.join, um plattformunabhängige Pfade zu gewährleisten. // Passe den Pfad zu deinen EJS-Templates (z.B. views/tasks/...) entsprechend an!

  const viewsPath = path.join(__dirname, "views");

  const createTaskContentHtml = ejs.render(
    fs.readFileSync(
      path.join(viewsPath, "task_board_create_modal.ejs"),
      "utf-8"
    ),
    { users: users, __: req.__ } // req.__ ist wichtig für i18n in der View
  );
  const editTaskContentHtml = ejs.render(
    fs.readFileSync(path.join(viewsPath, "task_board_edit_modal.ejs"), "utf-8"),
    { users: users, __: req.__ }
  ); // --- ENDE VOR-RENDERING ---
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
  }); // 4. View über die Helferfunktion rendern

  renderView(req, res, "task_board", title, {
    users: users,
    tasksByDayAndUser: tasksByDayAndUser,
    daysOfWeek: daysOfWeek,
    weekRange: `${weekStartFormat} - ${weekEndFormat}`, // NEUE VARIABLEN an die View übergeben
    createTaskContentHtml: createTaskContentHtml,
    editTaskContentHtml: editTaskContentHtml,
  });
});

// POST, PUT, DELETE Routen unverändert...
router.post("/api/tasks", ensureAuthenticated, taskController.createTask);
router.put("/api/tasks/:id", ensureAuthenticated, taskController.updateTask);
router.delete("/api/tasks/:id", ensureAuthenticated, taskController.deleteTask);

module.exports = router;
