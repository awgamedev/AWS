const express = require("express");
const router = express.Router();
const Stamping = require("./stamping.model");
const { ensureAuthenticated } = require("../../middleware/auth");
const { renderView } = require("../../utils/view-renderer");
const { formatTime, formatDate } = require("../../utils/date-utils");
const { getStampingPairs } = require("./utils/stamping-pair-utils");
const { validateStampingData } = require("./stamping.validator");

// Centralized allowed reasons
const { ALLOWED_STAMPING_REASONS } = require("./stamping.constants");

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
      lastStampingTime = formatTime(lastStamping.date);
    }

    // 2. Stempel-Paare für die Liste abrufen
    const stampings = await Stamping.find({ userId })
      .sort({ date: 1 }) // Wichtig: Aufsteigend sortieren
      .exec();

    stampingPairs = await getStampingPairs(stampings);
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

  renderView(req, res, "stamping_user", title, {
    currentStatus: currentStatus,
    lastStampingTime: lastStampingTime,
    stampingPairs: stampingPairs,
    allowedReasons: ALLOWED_STAMPING_REASONS,
    formatDate: formatDate,
    formatTime: formatTime,
  });
});

// A route for an employee to stamp in or out (/stamp) - remains an API route
router.post("/stamp", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { stampingType, stampingReason } = req.body;

    const validationErrors = await validateStampingData(
      req,
      ALLOWED_STAMPING_REASONS
    );

    // If there are validation errors, re-render the form with errors
    if (Object.keys(validationErrors).length > 0) {
      return res
        .status(400)
        .json({ msg: "Ungültige Stempeldaten.", errors: validationErrors });
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

// A route to get the current stamping status (/status) - remains an API route
router.get("/status", ensureAuthenticated, async (req, res) => {
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
    console.error("Error fetching stamping status:", err.message);
    res.status(500).json({ msg: "Server error while fetching status." });
  }
});

// Provide allowed reasons to client
router.get("/stamp/reasons", ensureAuthenticated, (req, res) => {
  res.json({ reasons: ALLOWED_STAMPING_REASONS });
});

module.exports = router;
