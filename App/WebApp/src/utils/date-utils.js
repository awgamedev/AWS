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

/**
 * Get month name in German
 */
const getMonthNameDisplay = (date) =>
  date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
  });

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

function getDaysOfTheWeek() {
  return [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];
}

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // Passe den Tag an, sodass 0 = Sonntag, 1 = Montag, ..., 6 = Samstag.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + days);
  return newDate;
};

/**
 * Formats week range for display
 */
function formatWeekRange(startOfWeek) {
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
  });

  return `${weekStartFormat} - ${weekEndFormat}`;
}

/**
 * Calculates the end of the displayed week
 */
function getEndOfDisplayedWeek(startOfWeek) {
  const endOfWeek = addDays(startOfWeek, 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}

/**
 * Get start and end date for a given month
 */
const getMonthDateRange = (year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

module.exports = {
  dateUpdateTime,
  formatTime,
  formatDate,
  getDaysOfTheWeek,
  getStartOfWeek,
  addDays,
  formatWeekRange,
  getEndOfDisplayedWeek,
  getMonthNameDisplay,
  getMonthDateRange,
};
