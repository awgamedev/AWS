const User = require("./user.model");

/**
 * Validates user data and returns an object with field-specific errors
 * @param {Object} req - Express request object
 * @param {boolean} isEdit - Flag indicating if it's an edit operation
 * @param {string} username - Username to validate
 * @param {string} password - Password to validate
 * @param {string} email - Email to validate
 * @returns {Object} - Object with field names as keys and error messages as values
 */
const validateUserData = async (req, isEdit, username, password, email) => {
  const errors = {};

  if (!isEdit) {
    if (!password) {
      errors.password = req.__("ERROR_PASSWORD_REQUIRED");
    } else if (password.length < 6) {
      errors.password = req.__("ERROR_PASSWORD_LENGTH");
    }
  } else {
    if (password && password.length < 6) {
      errors.password = req.__("ERROR_PASSWORD_LENGTH");
    }
  }

  if (!email) {
    errors.email = req.__("ERROR_EMAIL_REQUIRED");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = req.__("ERROR_EMAIL_INVALID");
  }

  if (!isEdit) {
    // Check for email uniqueness
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      errors.email = req.__("ERROR_EMAIL_EXISTS");
    }

    // Check for username uniqueness
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      errors.username = req.__("ERROR_USERNAME_EXISTS");
    }
  }

  return errors;
};

/**
 * Validates user details data including profile information
 * @param {Object} req - Express request object
 * @param {string} userId - User ID being edited
 * @param {string} username - Username to validate
 * @param {string} password - Password to validate (optional)
 * @param {string} email - Email to validate
 * @param {number|string} pauseInMinutesPerDay - Pause time in minutes
 * @param {number|string} vacationDaysPerYear - Vacation days per year
 * @returns {Object} - Object with field names as keys and error messages as values
 */
const validateUserDetailsData = async (
  req,
  userId,
  username,
  password,
  email,
  pauseInMinutesPerDay,
  vacationDaysPerYear
) => {
  const errors = {};

  // Validate username
  if (!username || username.trim() === "") {
    errors.username = req.__("ERROR_USERNAME_REQUIRED");
  } else {
    // Check for username uniqueness (excluding current user)
    const existingUsername = await User.findOne({
      username,
      _id: { $ne: userId },
    });
    if (existingUsername) {
      errors.username = req.__("ERROR_USERNAME_EXISTS");
    }
  }

  // Validate password (optional, but if provided must be valid)
  if (password && password.length < 6) {
    errors.password = req.__("ERROR_PASSWORD_LENGTH");
  }

  // Validate email
  if (!email) {
    errors.email = req.__("ERROR_EMAIL_REQUIRED");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = req.__("ERROR_EMAIL_INVALID");
  } else {
    // Check for email uniqueness (excluding current user)
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      errors.email = req.__("ERROR_EMAIL_EXISTS");
    }
  }

  // Validate pauseInMinutesPerDay (optional, but if provided must be valid)
  if (pauseInMinutesPerDay !== "" && pauseInMinutesPerDay !== null) {
    const pauseNum = Number(pauseInMinutesPerDay);
    if (isNaN(pauseNum) || pauseNum < 0) {
      errors.pauseInMinutesPerDay = req.__("ERROR_PAUSE_TIME_INVALID");
    }
  }

  // Validate vacationDaysPerYear (required)
  if (!vacationDaysPerYear) {
    errors.vacationDaysPerYear = req.__("ERROR_VACATION_DAYS_REQUIRED");
  } else {
    const vacationNum = Number(vacationDaysPerYear);
    if (isNaN(vacationNum) || vacationNum < 0) {
      errors.vacationDaysPerYear = req.__("ERROR_VACATION_DAYS_INVALID");
    }
  }

  return errors;
};

module.exports = { validateUserData, validateUserDetailsData };
