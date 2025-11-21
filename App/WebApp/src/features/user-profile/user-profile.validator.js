/**
 * Validation logic for user profile data
 */

/**
 * Validate user profile data
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Object containing validation errors
 */
async function validateUserProfileData(req) {
  const errors = {};
  const { pauseInMinutesPerDay, vacationDaysPerYear, sickDaysPerYear } =
    req.body;

  // Validate pauseInMinutesPerDay (optional field)
  if (
    pauseInMinutesPerDay !== null &&
    pauseInMinutesPerDay !== undefined &&
    pauseInMinutesPerDay !== ""
  ) {
    const pauseValue = parseInt(pauseInMinutesPerDay);
    if (isNaN(pauseValue) || pauseValue < 0 || pauseValue > 480) {
      errors.pauseInMinutesPerDay =
        req.__("INVALID_PAUSE_TIME") ||
        "Pause time must be between 0 and 480 minutes.";
    }
  }

  // Validate vacationDaysPerYear (required field)
  if (!vacationDaysPerYear || vacationDaysPerYear === "") {
    errors.vacationDaysPerYear =
      req.__("VACATION_DAYS_REQUIRED") || "Vacation days per year is required.";
  } else {
    const vacationValue = parseInt(vacationDaysPerYear);
    if (isNaN(vacationValue) || vacationValue < 0 || vacationValue > 365) {
      errors.vacationDaysPerYear =
        req.__("INVALID_VACATION_DAYS") ||
        "Vacation days must be between 0 and 365.";
    }
  }

  // Validate sickDaysPerYear (required field)
  if (!sickDaysPerYear || sickDaysPerYear === "") {
    errors.sickDaysPerYear =
      req.__("SICK_DAYS_REQUIRED") || "Sick days per year is required.";
  } else {
    const sickValue = parseInt(sickDaysPerYear);
    if (isNaN(sickValue) || sickValue < 0 || sickValue > 365) {
      errors.sickDaysPerYear =
        req.__("INVALID_SICK_DAYS") || "Sick days must be between 0 and 365.";
    }
  }

  return errors;
}

module.exports = {
  validateUserProfileData,
};
