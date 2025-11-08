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

// Funktion zum Erstellen des Mitarbeiter-HTML
const generateEmployeeHtml = (userData, monthName) => {
  let calendarHtml = "";

  // Sortiere die Tage für den Kalender
  const sortedDays = Object.keys(userData.dailyWork).sort();

  sortedDays.forEach((day) => {
    const dayData = userData.dailyWork[day];
    const dateString = new Date(day).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      weekday: "short",
    });

    const pairsHtml = dayData.pairs
      .map((pair) => {
        const durationDisplay = pair.unclosed ? "" : ` (${pair.duration}h)`;
        const timeClass = pair.unclosed
          ? "text-red-500 font-bold"
          : "text-gray-700";
        return `<p class="text-sm">
                  <span class="font-semibold">${pair.in}</span> - 
                  <span class="${timeClass}">${pair.out}</span>
                  <span class="text-xs text-gray-500">${durationDisplay}</span>
                </p>`;
      })
      .join("");

    calendarHtml += `
        <div class="p-3 border-b border-gray-100 flex justify-between items-start hover:bg-gray-50 transition duration-100">
          <div>
            <span class="font-bold text-gray-900">${dateString}</span>
          </div>
          <div class="text-right space-y-1">
            ${pairsHtml}
            <p class="text-xs font-medium ${
              dayData.totalTimeHours > 0 ? "text-blue-600" : "text-gray-400"
            } mt-1">
              Gesamt: ${dayData.totalTimeHours} h
            </p>
          </div>
        </div>
      `;
  });

  return `
      <div class="bg-white p-6 rounded-xl shadow-lg mb-6 border-t-4 border-blue-500">
        <div class="flex justify-between items-center mb-4 border-b pb-3">
          <h3 class="text-2xl font-bold text-gray-800">${userData.username}</h3>
          <span class="text-3xl font-extrabold text-blue-600">${
            userData.totalHours
          } h</span>
        </div>

        <h4 class="text-lg font-semibold text-gray-700 mb-3">Tägliche Aufzeichnungen im ${monthName}</h4>
        
        <div class="max-h-80 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
          ${
            calendarHtml.length > 0
              ? calendarHtml
              : '<div class="p-4 text-gray-500 text-center">Keine Stempelungen im gewählten Monat gefunden.</div>'
          }
        </div>
      </div>
    `;
};

module.exports = { processStampings, generateEmployeeHtml };
