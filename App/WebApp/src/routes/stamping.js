const express = require("express");
const router = express.Router();
const Stamping = require("../models/Stamping"); // Dein Stamping-Model
const { ensureAuthenticated } = require("../middleware/auth"); // Deine Authentifizierungs-Middleware
const bcrypt = require("bcryptjs"); // Beibehalten, falls es im Original-User-File benötigt wird

// NEU: Array der erlaubten Stempelungsgründe (für GET-Route und POST-Handler)
const ALLOWED_REASONS = ["Kühe melken", "Feldarbeit", "Büroarbeit"];

// --- HILFSFUNKTIONEN ZUM EJS-RENDERING (Übernommen von user.js zur Konsistenz) ---

/**
 * Rendert das Hauptlayout mit dem zuvor gerenderten Content-String.
 * HINWEIS: Diese Funktion sollte idealerweise zentral in einem Utility-File liegen.
 */
const renderWithLayout = (req, res, title, contentHtml, styles = "") => {
  // res.render() für das Layout, welches den contentHtml als bodyContent enthält
  // Annahme: Ihr EJS-Setup nutzt 'layout' als Haupt-Template
  res.render("layout", {
    title: title,
    styles: styles,
    bodyContent: contentHtml,
    // Annahme: req.user wird auch im Layout benötigt
    user: req.user,
    path: req.path,
  });
};

/**
 * Rendert eine innere EJS-View und bettet sie in das Hauptlayout ein.
 * HINWEIS: Diese Funktion sollte idealerweise zentral in einem Utility-File liegen.
 */
const renderView = (
  req,
  res,
  viewName,
  title,
  innerLocals = {},
  specificStyles = "",
  statusCode = 200
) => {
  res.status(statusCode);

  // Füge Standard-Locals hinzu, die in den Views benötigt werden (i18n, genThItems)
  const viewLocals = {
    ...innerLocals,
    // Annahme: req.__ ist Ihre i18n-Funktion
    __: req.__ ? req.__.bind(req) : (key) => key,
    // Fügen Sie hier weitere Globale Locals hinzu, falls benötigt (z.B. genThItems)
  };

  // 1. Innere View als String rendern
  req.app.render(viewName, viewLocals, (err, contentHtml) => {
    if (err) {
      console.error(`Error rendering view ${viewName}:`, err);
      // Fallback: Einfaches Rendering der Fehlerseite
      const errorTitle = req.__ ? req.__("ERROR_TITLE") : "Fehler";
      const fallbackMsg = req.__
        ? req.__("RENDER_ERROR")
        : "Ein interner Rendering-Fehler ist aufgetreten.";
      const fallbackContent = `<div class="text-red-500 p-8"><h1>${errorTitle}</h1><p>${fallbackMsg}</p></div>`;

      return renderWithLayout(req, res, errorTitle, fallbackContent, "");
    }

    // 2. Layout mit dem gerenderten Content rendern
    renderWithLayout(req, res, title, contentHtml, specificStyles);
  });
};

/**
 * Hilfsfunktionen für die Datenverarbeitung
 */

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
router.get("/stamping", ensureAuthenticated, async (req, res) => {
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
