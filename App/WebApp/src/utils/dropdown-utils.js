/**
 * Generate month dropdown options
 */
const generateMonthOptions = (year, selectedMonth) => {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    const m = i + 1;
    const name = d.toLocaleDateString("de-DE", { month: "long" });
    return { value: m, name: name, isSelected: m === selectedMonth };
  });
};

/**
 * Generate year dropdown options
 */
const generateYearOptions = (currentYear, selectedYear) => {
  return [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
    value: y,
    isSelected: y === selectedYear,
  }));
};

module.exports = {
  generateMonthOptions,
  generateYearOptions,
};
