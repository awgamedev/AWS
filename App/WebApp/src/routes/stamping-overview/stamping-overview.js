const express = require("express");
const router = express.Router();
const Stamping = require("../../models/Stamping"); // Dein Stamping-Model
const User = require("../../models/User"); // Dein User-Model für Benutzernamen
const generateLayout = require("../../utils/layout"); // Deine Layout-Funktion
// Verwende die existierende Middleware, angenommen sie ist in auth.js verfügbar
// und wird NACH ensureAuthenticated aufgerufen.
const { ensureAuthenticated, checkRole } = require("../../middleware/auth");
const {
  processStampings,
  generateEmployeeHtml,
} = require("./stamping-overview-utlis");

// 📊 GET Route: Admin-Übersicht über alle Stempelungen (/stamping-overview)
// Verwendung der bereitgestellten checkRole Middleware
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
      return res
        .status(500)
        .send(
          generateLayout(
            "Fehler",
            '<h1 class="text-3xl font-bold text-red-600">Serverfehler</h1><p class="text-gray-600">Ein Fehler ist beim Laden der Übersicht aufgetreten.</p>',
            req.path,
            req.user
          )
        );
    }

    // --- HTML-Generierung ---

    const monthName = startDate.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
    });

    // Sortiere nach Benutzernamen
    const sortedUserIds = Object.keys(overviewData).sort((a, b) =>
      overviewData[a].username.localeCompare(overviewData[b].username)
    );

    const employeesHtml = sortedUserIds
      .map((userId) => generateEmployeeHtml(overviewData[userId], monthName))
      .join("");

    // Dropdown für Monatsauswahl generieren
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, i, 1);
      const m = i + 1;
      const monthNameDisplay = d.toLocaleDateString("de-DE", { month: "long" });
      const isSelected = m === month ? "selected" : "";
      return `<option value="${m}" ${isSelected}>${monthNameDisplay}</option>`;
    }).join("");

    const yearOptions = [
      currentDate.getFullYear() - 1,
      currentDate.getFullYear(),
      currentDate.getFullYear() + 1,
    ]
      .map((y) => {
        const isSelected = y === year ? "selected" : "";
        return `<option value="${y}" ${isSelected}>${y}</option>`;
      })
      .join("");

    const content = `
        <h1 class="text-3xl font-bold text-gray-900 mb-6">🗓️ Admin: Monatsübersicht Stempelungen</h1>

        <div class="bg-white p-4 rounded-xl shadow-lg mb-6 flex space-x-4 items-center">
            <span class="text-lg font-semibold text-gray-700">Zeitraum wählen:</span>
            <select id="month-select" class="p-2 border border-gray-300 rounded-lg">
                ${monthOptions}
            </select>
            <select id="year-select" class="p-2 border border-gray-300 rounded-lg">
                ${yearOptions}
            </select>
        </div>

        <div class="bg-blue-600 p-6 rounded-xl shadow-2xl mb-8 text-white">
            <h2 class="text-xl font-medium mb-2">Gesamte Arbeitsstunden aller Mitarbeiter im ${monthName}</h2>
            <p class="text-5xl font-extrabold">${totalMonthlyHours} Stunden</p>
        </div>

        <div id="employee-overview" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            ${
              employeesHtml.length > 0
                ? employeesHtml
                : '<div class="bg-white p-6 rounded-xl shadow-lg text-gray-500 col-span-full">Keine Mitarbeiter oder Stempeldaten für diesen Monat gefunden.</div>'
            }
        </div>

        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const monthSelect = document.getElementById('month-select');
                const yearSelect = document.getElementById('year-select');
                
                const navigateToSelectedMonth = () => {
                    const selectedMonth = monthSelect.value;
                    const selectedYear = yearSelect.value;
                    // Seite mit den neuen Query-Parametern neu laden
                    window.location.href = \`/stamping-overview?month=\${selectedMonth}&year=\${selectedYear}\`;
                };

                monthSelect.addEventListener('change', navigateToSelectedMonth);
                yearSelect.addEventListener('change', navigateToSelectedMonth);
            });
        </script>
    `;

    res.send(
      generateLayout(
        `Admin Übersicht ${monthName}`,
        content,
        req.path,
        req.user
      )
    );
  }
);

module.exports = router;
