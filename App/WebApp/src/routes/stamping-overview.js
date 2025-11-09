const express = require("express");
const router = express.Router();
const Stamping = require("../models/Stamping"); // Dein Stamping-Model
const User = require("../models/User"); // Dein User-Model für Benutzernamen
// ANNAHME: Du hast eine renderView-Funktion und die Middleware:
const { renderView } = require("../utils/view-renderer");
const { ensureAuthenticated, checkRole } = require("../middleware/auth");

// ----------------------------------------------------------------------
// 🛠️ HILFSFUNKTIONEN (Aus stamping-overview-utlis.js eingefügt)
// ----------------------------------------------------------------------

/**
 * Hilfsfunktion zum Runden von Dezimalzahlen
 * @param {number} value
 * @param {number} decimals
 */
const round = (value, decimals) => {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
};

/**
 * Gruppiert Stempelungen und berechnet die Arbeitszeit
 * @param {Array} stampings - Die abgerufenen Stempelungen
 * @returns {Object} - Ein Objekt mit Gesamtstunden und täglichen Aufzeichnungen
 */
const processStampings = (stampings) => {
  const dailyWork = {}; // Key: "YYYY-MM-DD"
  let totalHours = 0;

  // Sortierung nach Datum ist wichtig für die Paarbildung!
  stampings.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (let i = 0; i < stampings.length; i++) {
    const current = stampings[i];
    const next = stampings[i + 1];

    const dateKey = current.date.toISOString().substring(0, 10); // Format YYYY-MM-DD

    if (!dailyWork[dateKey]) {
      dailyWork[dateKey] = {
        pairs: [],
        totalTimeMs: 0,
      };
    }

    if (current.stampingType === "in" && next && next.stampingType === "out") {
      // Gültiges Paar gefunden (in -> out)
      const timeIn = current.date;
      const timeOut = next.date;
      const workDurationMs = timeOut.getTime() - timeIn.getTime();
      const workDurationHours = workDurationMs / (1000 * 60 * 60);

      dailyWork[dateKey].pairs.push({
        stampingReason: current.stampingReason,
        in: timeIn.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        out: timeOut.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: round(workDurationHours, 2), // Gerundete Stunden
      });
      dailyWork[dateKey].totalTimeMs += workDurationMs;
      totalHours += workDurationHours;

      i++; // Springe zum 'out'-Eintrag, da dieser verarbeitet wurde
    } else if (
      current.stampingType === "in" &&
      (!next || next.stampingType === "in")
    ) {
      // Nur 'in' ohne passendes 'out' (z.B. der letzte Eintrag ist 'in')
      dailyWork[dateKey].pairs.push({
        in: current.date.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        out: "FEHLT",
        duration: 0,
        unclosed: true, // Markiere als unvollständig
      });
    }
    // 'out' ohne vorheriges 'in' wird ignoriert, da es kein Paar bilden kann
  }

  // Konvertiere Gesamtzeit pro Tag in Stunden (gerundet)
  Object.keys(dailyWork).forEach((dateKey) => {
    dailyWork[dateKey].totalTimeHours = round(
      dailyWork[dateKey].totalTimeMs / (1000 * 60 * 60),
      2
    );
    delete dailyWork[dateKey].totalTimeMs; // Entferne die MS-Version
  });

  return {
    totalHours: round(totalHours, 2),
    dailyWork,
  };
};

// ----------------------------------------------------------------------
// 🔄 ROUTEN-LOGIK
// ----------------------------------------------------------------------

// 📊 GET Route: Admin-Übersicht über alle Stempelungen (/stamping-overview)
router.get(
  "/stamping-overview",
  ensureAuthenticated,
  checkRole("admin"),
  async (req, res) => {
    const currentDate = new Date();
    // Standardmäßig den aktuellen Monat verwenden
    const year = parseInt(req.query.year) || currentDate.getFullYear();
    const month = parseInt(req.query.month) || currentDate.getMonth() + 1; // Monate: 1-12

    // Erster und letzter Tag des ausgewählten Monats
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Letzter Tag, Ende des Tages

    let overviewData = {};
    let totalMonthlyHours = 0;
    let allUsers;

    try {
      // 1. Alle Benutzer abrufen
      allUsers = await User.find({}).select("_id username").exec();

      // 2. Alle Stempelungen für den Monat abrufen, sortiert nach Benutzer und Datum
      const allStampings = await Stamping.find({
        date: { $gte: startDate, $lte: endDate },
      })
        .sort({ userId: 1, date: 1 })
        .exec();

      // 3. Gruppiere die Stempelungen nach Benutzer-ID
      const stampingsByUser = allStampings.reduce((acc, stamp) => {
        const userId = stamp.userId.toString();
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push(stamp);
        return acc;
      }, {});

      // 4. Verarbeite die Stempelungen für jeden Benutzer
      for (const userId in stampingsByUser) {
        const userStampings = stampingsByUser[userId];
        // Finde den Benutzer, um den Namen zu erhalten
        const userData = allUsers.find((u) => u._id.toString() === userId);
        const username = userData
          ? userData.username
          : `Unbekannter Benutzer (${userId})`;

        const result = processStampings(userStampings);

        overviewData[userId] = {
          username,
          totalHours: result.totalHours,
          dailyWork: result.dailyWork,
        };

        totalMonthlyHours += result.totalHours;
      }

      // Füge auch Benutzer hinzu, die keine Stempelungen haben
      allUsers.forEach((user) => {
        const userId = user._id.toString();
        if (!overviewData[userId]) {
          overviewData[userId] = {
            username: user.username,
            totalHours: 0,
            dailyWork: {},
          };
        }
      });
    } catch (error) {
      console.error("Fehler beim Abrufen der Admin-Übersicht:", error.message);
      // Fehler mit renderView rendern
      return renderView(
        req,
        res,
        "error_message",
        "Serverfehler", // Titel für Fehlerseite
        {
          message: "Ein Fehler ist beim Laden der Übersicht aufgetreten.",
          details: error.message,
        },
        req.path,
        500
      );
    }

    // --- Daten für die EJS-Ansicht vorbereiten ---

    const monthNameDisplay = startDate.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
    });

    // Sortiere nach Benutzernamen
    const sortedUserOverviewData = Object.values(overviewData).sort((a, b) =>
      a.username.localeCompare(b.username)
    );

    // Dropdown-Optionen generieren
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, i, 1);
      const m = i + 1;
      const name = d.toLocaleDateString("de-DE", { month: "long" });
      return { value: m, name: name, isSelected: m === month };
    });

    const yearOptions = [
      currentDate.getFullYear() - 1,
      currentDate.getFullYear(),
      currentDate.getFullYear() + 1,
    ].map((y) => ({
      value: y,
      isSelected: y === year,
    }));

    // Daten an die EJS-View übergeben und rendern
    renderView(
      req,
      res,
      "stamping_overview_admin",
      `Monatsübersicht Stempelungen`,
      {
        overviewData: sortedUserOverviewData,
        totalMonthlyHours: round(totalMonthlyHours, 2), // Gesamtsumme auch runden
        monthName: monthNameDisplay,
        currentYear: year,
        currentMonth: month,
        monthOptions: monthOptions,
        yearOptions: yearOptions,
        // Hilfsfunktionen für EJS bereitstellen
        formatDate: (dateString) =>
          new Date(dateString).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            weekday: "short",
          }),
      }
    );
  }
);

module.exports = router;
