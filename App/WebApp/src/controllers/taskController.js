// controllers/taskController.js

const Task = require("../models/Task"); // Achte auf den korrekten Pfad

// 1. POST: Eine neue Aufgabe erstellen
exports.createTask = async (req, res) => {
  // Annahme: Die Daten kommen aus dem Frontend-Formular.
  const { userId, taskName, taskDescription, startDate, endDate } = req.body;

  const createdBy = req.user.username || "Admin"; // Nimmt an, dass req.user.username existiert
  const modifiedBy = createdBy;

  if (!taskName || !startDate) {
    return res.status(400).json({
      msg: "Bitte geben Sie einen Mitarbeiter, einen Aufgabennamen und ein Startdatum an.",
    });
  }

  try {
    const newTask = new Task({
      userId,
      taskName,
      taskDescription: taskDescription || "",
      taskStatus: "pending",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
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
    if (err.name === "ValidationError") {
      return res.status(400).json({
        msg: `Validierungsfehler: ${Object.values(err.errors)
          .map((e) => e.message)
          .join(", ")}`,
      });
    }
    res.status(500).json({ msg: "Serverfehler beim Speichern der Aufgabe." });
  }
};

// 2. PUT: Eine bestehende Aufgabe aktualisieren
exports.updateTask = async (req, res) => {
  const taskId = req.params.id;
  const { userId, taskName, taskDescription, taskStatus, startDate, endDate } =
    req.body;

  const modifiedBy = req.user.username || "Admin";

  if (!taskName || !startDate || !taskStatus) {
    return res.status(400).json({
      msg: "Bitte geben Sie Aufgabennamen, Startdatum und Status an.",
    });
  }

  try {
    const updateFields = {
      userId,
      taskName,
      taskDescription,
      taskStatus,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      modifiedBy,
      modifiedAt: new Date(),
    };

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ msg: "Aufgabe nicht gefunden." });
    }

    res.status(200).json({
      msg: "Aufgabe erfolgreich aktualisiert.",
      task: updatedTask,
    });
  } catch (err) {
    console.error("Fehler beim Aktualisieren der Aufgabe:", err.message);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        msg: `Validierungsfehler: ${Object.values(err.errors)
          .map((e) => e.message)
          .join(", ")}`,
      });
    }
    res
      .status(500)
      .json({ msg: "Serverfehler beim Aktualisieren der Aufgabe." });
  }
};
