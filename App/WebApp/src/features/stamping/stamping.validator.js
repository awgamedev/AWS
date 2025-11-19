const Stamping = require("./stamping.model");

/**
 * Validates stamping data
 * @param {Object} req - Request object with body, user, and __ (translator)
 * @param {Array} allowedReasons - Array of allowed stamping reasons
 * @param {boolean} skipSequenceCheck - If true, skips the in/out sequence validation (for admin manual entries)
 * @returns {Object} - Errors object
 */
async function validateStampingData(
  req,
  allowedReasons,
  skipSequenceCheck = false
) {
  const userId = req.user.id;
  const { stampingType, stampingReason } = req.body;

  const errors = {};

  // Validate stamping type
  if (!stampingType || !["in", "out"].includes(stampingType)) {
    errors.stampingType = req.__("ERROR_INVALID_STAMPING_TYPE");
    return errors; // Return early if type is invalid
  }

  // Validate stamping reason for "in" type
  if (stampingType === "in") {
    if (!stampingReason || !allowedReasons.includes(stampingReason)) {
      errors.stampingReason = req.__("ERROR_INVALID_STAMPING_REASON");
    }
  }

  // Skip sequence validation for admin-created entries (can create in the past)
  if (skipSequenceCheck) {
    return errors;
  }

  // Check sequence: prevent double "in" or "out" without the other
  const lastStamping = await Stamping.findOne({ userId })
    .sort({ date: -1 })
    .exec();

  if (
    stampingType === "in" &&
    lastStamping &&
    lastStamping.stampingType === "in"
  ) {
    errors.stampingSequence = req.__("ERROR_ALREADY_STAMPED_IN");
  }

  if (
    stampingType === "out" &&
    (!lastStamping || lastStamping.stampingType === "out")
  ) {
    errors.stampingSequence = req.__("ERROR_NOT_STAMPED_IN");
  }

  return errors;
}

module.exports = { validateStampingData };
