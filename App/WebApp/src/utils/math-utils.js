/**
 * Hilfsfunktion zum Runden von Dezimalzahlen
 * @param {number} value
 * @param {number} decimals
 */
const round = (value, decimals) => {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
};

module.exports = { round };
