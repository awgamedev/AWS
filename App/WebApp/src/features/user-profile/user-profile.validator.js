/**
 * Validates user profile data
 * @param {Object} req - Express request object
 * @param {number|string} pauseInMinutesPerDay - Pause time in minutes per day
 * @param {number|string} vacationDaysPerYear - Vacation days per year
 * @returns {Object} - Object with field names as keys and error messages as values
 */
const validateProfileData = async (
  req,
  pauseInMinutesPerDay,
  vacationDaysPerYear
) => {
  const errors = {};

  // Validate pauseInMinutesPerDay (optional, but if provided must be valid)
  if (pauseInMinutesPerDay !== "" && pauseInMinutesPerDay !== null) {
    const pauseNum = Number(pauseInMinutesPerDay);
    if (isNaN(pauseNum) || pauseNum < 0) {
      errors.pauseInMinutesPerDay = req.__("ERROR_PAUSE_TIME_INVALID");
    }
  }

  // Validate vacationDaysPerYear (required)
  if (!vacationDaysPerYear && vacationDaysPerYear !== 0) {
    errors.vacationDaysPerYear = req.__("ERROR_VACATION_DAYS_REQUIRED");
  } else {
    const vacationNum = Number(vacationDaysPerYear);
    if (isNaN(vacationNum) || vacationNum < 0) {
      errors.vacationDaysPerYear = req.__("ERROR_VACATION_DAYS_INVALID");
    }
  }

  return errors;
};

module.exports = { validateProfileData };
