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

/**
 * Validates stamping pair edit data
 * @param {Object} req - Request object with body and __ (translator)
 * @param {Array} allowedReasons - Array of allowed stamping reasons
 * @returns {Object} - Errors object
 */
async function validateStampingPairEdit(req, allowedReasons) {
  const { reason, date, inTime, outTime } = req.body;
  const errors = {};

  // Validate reason
  if (!reason || !allowedReasons.includes(reason)) {
    errors.reason = req.__("ERROR_INVALID_STAMPING_REASON");
  }

  // Validate date
  if (!date) {
    errors.date = req.__("ERROR_DATE_REQUIRED");
  }

  // Validate arrive time
  if (!inTime) {
    errors.inTime = req.__("ERROR_ARRIVE_TIME_REQUIRED");
  }

  // Validate leave time logic (if provided, must be after arrive time)
  if (outTime) {
    if (!inTime) {
      errors.outTime = req.__("ERROR_ARRIVE_TIME_REQUIRED_FIRST");
    } else {
      // Compare times
      const inDateTime = new Date(`${date}T${inTime}:00`);
      const outDateTime = new Date(`${date}T${outTime}:00`);

      if (outDateTime <= inDateTime) {
        errors.outTime = req.__("ERROR_LEAVE_TIME_AFTER_ARRIVE");
      }
    }
  }

  return errors;
}

/**
 * Validates that a stamping pair does not overlap with existing stampings
 * @param {Object} req - Request object with body and __ (translator)
 * @param {string} userId - User ID to check stampings for
 * @param {string|null} excludeInId - Optional: Exclude this inId when editing (to allow updating the same pair)
 * @param {string|null} excludeOutId - Optional: Exclude this outId when editing
 * @returns {Object} - Errors object
 */
async function validateStampingPairOverlap(
  req,
  userId,
  excludeInId = null,
  excludeOutId = null
) {
  const { date, inTime, outTime } = req.body;
  const errors = {};

  if (!date || !inTime) {
    return errors; // Basic validation should catch this
  }

  // Parse the new stamping pair times
  const [year, month, day] = date.split("-").map(Number);
  const [inHour, inMinute] = inTime.split(":").map(Number);
  const newInTime = new Date(year, month - 1, day, inHour, inMinute, 0);

  let newOutTime = null;
  if (outTime) {
    const [outHour, outMinute] = outTime.split(":").map(Number);
    newOutTime = new Date(year, month - 1, day, outHour, outMinute, 0);
  }

  // Get all stampings for this user on the same date
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

  const stampings = await Stamping.find({
    userId,
    date: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ date: 1 });

  // Filter out the stampings being edited
  const relevantStampings = stampings.filter(
    (s) => s._id.toString() !== excludeInId && s._id.toString() !== excludeOutId
  );

  if (relevantStampings.length === 0) {
    return errors; // No existing stampings to check
  }

  // Group stampings into pairs
  const pairs = [];
  for (let i = 0; i < relevantStampings.length; i++) {
    const stamping = relevantStampings[i];
    if (stamping.stampingType === "in") {
      // Look for the next "out" stamping
      const outStamping = relevantStampings.find(
        (s, idx) =>
          idx > i && s.stampingType === "out" && s.date > stamping.date
      );

      pairs.push({
        inTime: stamping.date,
        outTime: outStamping ? outStamping.date : null,
      });
    }
  }

  // Check for overlaps
  for (const pair of pairs) {
    const existingIn = pair.inTime;
    const existingOut = pair.outTime;

    // Check if new pair overlaps with existing pair
    const hasOverlap = checkTimeOverlap(
      newInTime,
      newOutTime,
      existingIn,
      existingOut
    );

    if (hasOverlap) {
      errors.overlap = req.__("ERROR_STAMPING_OVERLAP");
      break;
    }
  }

  return errors;
}

/**
 * Helper function to check if two time periods overlap
 * @param {Date} newIn - New stamping in time
 * @param {Date|null} newOut - New stamping out time (can be null for open-ended)
 * @param {Date} existingIn - Existing stamping in time
 * @param {Date|null} existingOut - Existing stamping out time (can be null for open-ended)
 * @returns {boolean} - True if there is an overlap
 */
function checkTimeOverlap(newIn, newOut, existingIn, existingOut) {
  // Case 1: New stamping has no out time (open-ended)
  if (!newOut) {
    // Overlaps if:
    // - Existing has no out time (both open-ended at different times)
    // - New in time is before existing out time
    if (!existingOut) {
      return true; // Two open-ended periods always overlap
    }
    return newIn < existingOut;
  }

  // Case 2: Existing stamping has no out time (open-ended)
  if (!existingOut) {
    // Overlaps if new out time is after existing in time
    return newOut > existingIn;
  }

  // Case 3: Both have in and out times (closed periods)
  // Overlap occurs if:
  // - New in is between existing in and out
  // - New out is between existing in and out
  // - New period completely contains existing period
  // - Existing period completely contains new period
  return (
    (newIn >= existingIn && newIn < existingOut) || // New in overlaps
    (newOut > existingIn && newOut <= existingOut) || // New out overlaps
    (newIn <= existingIn && newOut >= existingOut) || // New contains existing
    (existingIn <= newIn && existingOut >= newOut) // Existing contains new
  );
}

module.exports = {
  validateStampingData,
  validateStampingPairEdit,
  validateStampingPairOverlap,
};
