// routes/all-task.js

const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User");
// import { getPriorityColor } from "./task-utils"; // Muss in EJS-View verfügbar sein oder im Controller angewendet werden
const { ensureAuthenticated } = require("../middleware/auth");
const { renderView } = require("../utils/view-renderer"); // Angenommen, du hast eine renderView-Funktion wie in tasks.js

// 📋 GET Route: Task Backlog anzeigen (/task-backlog)
router.get("/task-backlog", ensureAuthenticated, async (req, res) => {
  let allTasks = [];
  let users = [];
  let userMap = {};

  try {
    // Logik für die Sortierung nach Priorität
    const priorityOrder = { high: 1, medium: 2, low: 3 };

    // 1. Alle Tasks abrufen
    allTasks = await Task.find({}).lean().exec();

    // 2. Sortieren im Code (zuerst Nicht zugewiesen, dann nach User-ID, dann nach Priorität)
    allTasks.sort((a, b) => {
      // 1. Sortierung: Nicht zugewiesen (null) kommt zuerst
      if (a.userId === null && b.userId !== null) return -1;
      if (b.userId === null && a.userId !== null) return 1;

      // 2. Sortierung: Nach userId (falls beide vorhanden)
      if (a.userId !== null && b.userId !== null) {
        const userIdComparison = String(a.userId).localeCompare(
          String(b.userId)
        );
        if (userIdComparison !== 0) return userIdComparison;
      }

      // 3. Sortierung: Nach Priorität (wenn userId-Werte gleich oder beide null)
      return priorityOrder[a.taskPriority] - priorityOrder[b.taskPriority];
    });

    // 3. Alle Benutzer abrufen und UserMap erstellen
    users = await User.find({}).select("_id username").lean().exec();
    userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user.username;
      return map;
    }, {});

    // Füge den Usernamen zu jedem Task hinzu, damit EJS ihn direkt anzeigen kann
    allTasks = allTasks.map((task) => ({
      ...task,
      assignedUsername: userMap[task.userId?.toString()] || "Nicht zugewiesen",
      dateStr: task.startDate.toLocaleDateString("de-DE"),
    }));
  } catch (error) {
    console.error("Fehler beim Abrufen des Task Backlogs:", error.message);
    // Fehlerbehandlung: Leere Listen im Fehlerfall
    allTasks = [];
    users = [];

    // Du könntest hier auch eine Fehlermeldung flashen oder eine dedizierte Fehler-View rendern
    // Beispiel:
    // req.flash('error_msg', 'Fehler beim Laden der Aufgaben.');
    // return res.redirect('/');
  }

  // 4. EJS-View rendern und alle benötigten Daten übergeben
  // Annahme: renderView ist verfügbar und funktioniert wie in tasks.js
  renderView(req, res, "tasks/all_tasks", "Alle Aufgaben", {
    allTasks: allTasks,
    users: users,
    // Die Funktion getPriorityColor muss jetzt in der EJS-View verfügbar sein
    // oder du musst die notwendige Logik/Klasse direkt im EJS-Template abbilden.
    // Falls getPriorityColor eine einfache Helper-Funktion ist, kannst du sie als Local übergeben:
    // getPriorityColor: getPriorityColor,
  });
});

// 📅 POST Route: Task einem Benutzer zuweisen (/task-backlog/assign) - BLEIBT IM ROUTER
router.post("/task-backlog/assign", ensureAuthenticated, async (req, res) => {
  // ... Die Logik für die POST-Route bleibt unverändert in all-task.js, da sie eine API-Route ist.
  try {
    const { taskId, userId } = req.body;

    if (!taskId || !userId) {
      return res.status(400).json({ msg: "Fehlende Task- oder Benutzer-ID." });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        userId: userId,
        modifiedAt: Date.now(),
        modifiedBy: req.user.username || req.user.id,
        taskStatus: "pending",
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ msg: "Task nicht gefunden." });
    }

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
