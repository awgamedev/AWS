function dateUpdateTime(date, timeAsString) {
  if (!date) {
    // Loggen Sie hier einen Fehler, falls Sie ein Logger-Objekt zur Hand haben
    console.error("Error: No date provided to update time.");
    throw new Error("No date provided");
  }

  if (
    !timeAsString ||
    typeof timeAsString !== "string" ||
    !timeAsString.includes(":")
  ) {
    console.error(
      `Fehler: Ungültiges Zeitformat: ${timeAsString}. Erwartet 'HH:MM'.`
    );
    throw new Error(
      `Ungültiges Zeitformat: ${timeAsString}. Erwartet 'HH:MM'.`
    );
  }

  // 1. String parsen: Zerlegen in Stunden und Minuten
  const [hoursStr, minutesStr] = timeAsString.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  // 2. Validierung der geparsten Zahlen
  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    console.error(
      `Fehler: Stunden oder Minuten sind ungültig: ${timeAsString}`
    );
    throw new Error(
      `Ungültige Stunden oder Minuten: ${timeAsString}. Erwartet 'HH:MM'.`
    );
  }

  // 3. Uhrzeit im Date-Objekt setzen
  // setHours(Stunden, Minuten, Sekunden, Millisekunden)
  date.setHours(hours, minutes, 0, 0);

  // console.log(`Datum erfolgreich auf ${stamping.date.toISOString()} aktualisiert.`);
  return date;
}

// Funktion zur Formatierung der Zeit
function formatTime(date) {
  if (!date) {
    throw new Error("No date provided for formatting.");
  }
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Funktion zur Formatierung des Datums
function formatDate(date) {
  if (!date) {
    throw new Error("No date provided for formatting.");
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

module.exports = { dateUpdateTime, formatTime, formatDate };
