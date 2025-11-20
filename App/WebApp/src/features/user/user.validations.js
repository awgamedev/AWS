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

module.exports = { validateUserData };
