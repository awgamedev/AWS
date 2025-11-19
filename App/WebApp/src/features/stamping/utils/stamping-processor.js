const { round } = require("../../../utils/math-utils");

/**
 * Gruppiert Stempelungen und berechnet die Arbeitszeit
 * @param {Array} stampings - Die abgerufenen Stempelungen
 * @returns {Object} - Ein Objekt mit Gesamtstunden und täglichen Aufzeichnungen
 */
const processStampings = (stampings) => {
  const dailyWork = {};
  let totalHours = 0;

  stampings.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (let i = 0; i < stampings.length; i++) {
    const current = stampings[i];
    const next = stampings[i + 1];

    const dateKey = current.date.toISOString().substring(0, 10);

    if (!dailyWork[dateKey]) {
      dailyWork[dateKey] = {
        pairs: [],
        totalTimeMs: 0,
      };
    }

    if (current.stampingType === "in" && next && next.stampingType === "out") {
      const timeIn = current.date;
      const timeOut = next.date;
      const workDurationMs = timeOut.getTime() - timeIn.getTime();
      const workDurationHours = workDurationMs / (1000 * 60 * 60);

      dailyWork[dateKey].pairs.push({
        inId: current._id.toString(),
        outId: next._id.toString(),
        stampingReason: current.stampingReason,
        in: timeIn.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        out: timeOut.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: round(workDurationHours, 2),
      });
      dailyWork[dateKey].totalTimeMs += workDurationMs;
      totalHours += workDurationHours;

      i++;
    } else if (
      current.stampingType === "in" &&
      (!next || next.stampingType === "in")
    ) {
      dailyWork[dateKey].pairs.push({
        inId: current._id.toString(),
        in: current.date.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        out: "FEHLT",
        duration: 0,
        unclosed: true,
      });
    }
  }

  Object.keys(dailyWork).forEach((dateKey) => {
    dailyWork[dateKey].totalTimeHours = round(
      dailyWork[dateKey].totalTimeMs / (1000 * 60 * 60),
      2
    );
    delete dailyWork[dateKey].totalTimeMs;
  });

  return {
    totalHours: round(totalHours, 2),
    dailyWork,
  };
};

module.exports = {
  processStampings,
};
