const express = require("express");
const router = express.Router();
const Stamping = require("./stamping.model"); // Dein Stamping-Model
const { ensureAuthenticated } = require("../../middleware/auth"); // Deine Authentifizierungs-Middleware
const { renderView } = require("../../utils/view-renderer"); // Angenommen, du hast eine renderView-Funktion wie in tasks.js
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");

// NEU: Array der erlaubten Stempelungsgründe (für GET-Route und POST-Handler)
const ALLOWED_REASONS = ["Kühe melken", "Feldarbeit", "Büroarbeit"];

// Funktion zur Formatierung der Zeit
const formatTime = (stamping) => {
  if (!stamping) return "N/A";
  return stamping.date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Funktion zur Formatierung des Datums
const formatDate = (stamping) => {
  if (!stamping) return "N/A";
  return stamping.date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Funktion zur Paarung der Stempelvorgänge (Ein- und Ausstempelungen)
const getStampingPairs = async (userId) => {
  // Holen Sie alle Stempelungen und sortieren Sie sie aufsteigend nach Datum
  const stampings = await Stamping.find({ userId })
    .sort({ date: 1 }) // Wichtig: Aufsteigend sortieren
    .exec();

  let currentIn = null;
  const pairs = [];

  // Paar-Bildungs-Logik
  for (const stamp of stampings) {
    if (stamp.stampingType === "in") {
      if (currentIn) {
        // Ein vorheriges 'in' ohne passendes 'out'
        pairs.push({ come: currentIn.toObject(), go: null });
      }
      currentIn = stamp;
    } else if (stamp.stampingType === "out") {
      if (currentIn) {
        // Passendes 'out' gefunden
        pairs.push({ come: currentIn.toObject(), go: stamp.toObject() });
        currentIn = null;
      }
    }
  }

  if (currentIn) {
    // Der letzte Eintrag ist ein 'in' ohne 'out'
    pairs.push({ come: currentIn.toObject(), go: null });
  }

  // Sortiere die Paare für die Anzeige absteigend (die neuesten Paare zuerst)
  return pairs.reverse();
};

// ⏳ GET Route: Stempel-Interface anzeigen (/stamping)
router.get("/time-tracking/stamping", ensureAuthenticated, async (req, res) => {
  const title = req.__("STAMPING_PAGE_TITLE");
  let currentStatus = "out";
  let lastStampingTime = "N/A";
  let stampingPairs = [];

  try {
    const userId = req.user.id;

    // 1. Letzten Stempel-Eintrag abrufen
    const lastStamping = await Stamping.findOne({ userId })
      .sort({ date: -1 })
      .exec();

    if (lastStamping) {
      currentStatus = lastStamping.stampingType;
      lastStampingTime = formatTime(lastStamping);
    }

    // 2. Stempel-Paare für die Liste abrufen
    stampingPairs = await getStampingPairs(userId);
  } catch (error) {
    console.error("Fehler beim Abrufen der Stempeldaten:", error.message);
    // Fehlerseite rendern
    return renderView(
      req,
      res,
      "error_message",
      req.__ ? req.__("ERROR_TITLE") : "Fehler",
      {
        message: req.__
          ? req.__("STAMPING_LOAD_ERROR")
          : "Fehler beim Laden der Zeiterfassungsdaten.",
      },
      "",
      500
    );
  }

  // Daten an die EJS-Datei übergeben und View rendern
  renderView(req, res, "stamping_interface", title, {
    currentStatus: currentStatus,
    lastStampingTime: lastStampingTime,
    stampingPairs: stampingPairs,
    ALLOWED_REASONS: ALLOWED_REASONS,
    formatDate: formatDate, // Funktion für EJS bereitstellen
    formatTime: formatTime, // Funktion für EJS bereitstellen
  });
});

// 📅 POST Route: Mitarbeiter stempelt ein oder aus (/stamp) - Bleibt eine API-Route
// Die Logik bleibt gleich, da sie JSON zurückgibt und keine EJS-Views rendert.
router.post("/stamp", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { stampingType, stampingReason } = req.body;

    // ... (Validierungs- und Stempellogik bleibt unverändert) ...

    if (!stampingType || !["in", "out"].includes(stampingType)) {
      return res
        .status(400)
        .json({ msg: "Ungültiger Stempeltyp. Erlaubt sind 'in' oder 'out'." });
    }

    if (stampingType === "in") {
      if (!stampingReason || !ALLOWED_REASONS.includes(stampingReason)) {
        return res
          .status(400)
          .json({ msg: "Bitte wähle einen gültigen Stempelungsgrund aus." });
      }
    }

    const lastStamping = await Stamping.findOne({ userId })
      .sort({ date: -1 })
      .exec();

    if (
      stampingType === "in" &&
      lastStamping &&
      lastStamping.stampingType === "in"
    ) {
      return res
        .status(409)
        .json({ msg: "Fehler: Du bist bereits eingestempelt." });
    }

    if (
      stampingType === "out" &&
      (!lastStamping || lastStamping.stampingType === "out")
    ) {
      return res.status(409).json({
        msg: "Fehler: Du bist bereits ausgestempelt oder hast noch nicht eingestempelt.",
      });
    }

    const newStamping = new Stamping({
      userId,
      stampingType,
      stampingReason: stampingType === "in" ? stampingReason : undefined,
      date: new Date(),
    });

    const stampingEntry = await newStamping.save();

    res.status(201).json({
      msg: `Erfolgreich ${
        stampingType === "in" ? "eingestempelt" : "ausgestempelt"
      } ${
        stampingType === "in" ? `(Grund: ${stampingEntry.stampingReason})` : ""
      } um ${stampingEntry.date.toLocaleTimeString("de-DE")}.`,
      stamping: stampingEntry.toObject(),
    });
  } catch (err) {
    console.error("Fehler beim Stempelvorgang:", err.message);
    res
      .status(500)
      .json({ msg: "Serverfehler beim Verarbeiten des Stempelvorgangs." });
  }
});

// 🔎 GET Route: Aktuellen Stempelstatus abrufen (/status) - Bleibt eine API-Route
router.get("/status", ensureAuthenticated, async (req, res) => {
  // Die Logik bleibt gleich, da sie JSON zurückgibt.
  try {
    const userId = req.user.id;
    const lastStamping = await Stamping.findOne({ userId })
      .sort({ date: -1 })
      .exec();

    const status = lastStamping ? lastStamping.stampingType : "out";
    const lastTime = lastStamping ? lastStamping.date : null;

    res.json({
      userId,
      currentStatus: status,
      lastStampingTime: lastTime,
      msg: `Der aktuelle Status ist: ${
        status === "in" ? "Eingestempelt" : "Ausgestempelt"
      }.`,
    });
  } catch (err) {
    console.error("Fehler beim Abrufen des Status:", err.message);
    res.status(500).json({ msg: "Serverfehler beim Abrufen des Status." });
  }
});

module.exports = router;
