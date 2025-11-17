const Stamping = require("./stamping.model");

/**
 * Validate stamping edit payload against ordering and time constraints.
 * Rules:
 * - `arriveDate` is required, valid date, and not in the future.
 * - If `leaveDate` is provided: valid date, > arriveDate, and not in the future.
 * - Edited "in" stamping must remain between previous and next stampings.
 *   Specifically: prev.date < arriveDate < (pairedOut.date if no leaveDate else leaveDate) < nextAfterOut.date (if exists).
 * - Never delete stampings; this validator only checks constraints.
 * - Optional: `stampingReason` must be one of `allowedReasons` if provided.
 *
 * @param {Object} req Express request object (for i18n messages)
 * @param {Object} opts Options
 * @param {string} opts.id Stamping id being edited (must reference an "in" stamping)
 * @param {string} opts.userId Current user id (must own the stamping)
 * @param {string|Date} opts.arriveDate New arrival datetime
 * @param {string|Date} [opts.leaveDate] Optional leave datetime
 * @param {string} [opts.stampingReason] Optional reason (only meaningful for "in")
 * @param {string[]} [opts.allowedReasons] Optional list of allowed reasons
 * @param {Object} [opts.stampingDoc] Optional already-fetched stamping document
 * @returns {Object} errors map; empty when valid
 */
const validateStampingData = async (req, opts) => {
  const {
    id,
    userId,
    arriveDate,
    leaveDate,
    stampingReason,
    allowedReasons = [],
    stampingDoc,
  } = opts || {};

  const errors = {};

  // Resolve messages via i18n helper if available
  const t = (key, fallback) => (req.__ ? req.__(key) : fallback || key);

  // Parse dates
  const arrive = new Date(arriveDate);
  const now = new Date();
  if (!arriveDate || isNaN(arrive.getTime())) {
    errors.arriveDate = t(
      "STAMPING_ARRIVE_REQUIRED",
      "Arrival date is required and must be valid."
    );
    return errors;
  }
  if (arrive > now) {
    errors.arriveDate = t(
      "STAMPING_ARRIVE_IN_FUTURE",
      "Arrival cannot be in the future."
    );
  }

  let leave = null;
  if (leaveDate !== undefined && leaveDate !== null && leaveDate !== "") {
    leave = new Date(leaveDate);
    if (isNaN(leave.getTime())) {
      errors.leaveDate = t(
        "STAMPING_LEAVE_INVALID",
        "Leave date must be a valid datetime."
      );
    } else {
      if (leave <= arrive) {
        errors.leaveDate = t(
          "STAMPING_LEAVE_BEFORE_ARRIVE",
          "Leave must be after arrival."
        );
      }
      if (leave > now) {
        errors.leaveDate = t(
          "STAMPING_LEAVE_IN_FUTURE",
          "Leave cannot be in the future."
        );
      }
    }
  }

  // Early return on basic date issues
  if (Object.keys(errors).length > 0) return errors;

  // Validate reason (optional on edit)
  if (
    stampingReason !== undefined &&
    stampingReason !== null &&
    stampingReason !== ""
  ) {
    if (Array.isArray(allowedReasons) && allowedReasons.length > 0) {
      if (!allowedReasons.includes(stampingReason)) {
        errors.stampingReason = t(
          "STAMPING_REASON_INVALID",
          "Invalid stamping reason."
        );
      }
    }
  }

  if (Object.keys(errors).length > 0) return errors;

  // Fetch stamping and ownership/type checks
  const current = stampingDoc || (await Stamping.findById(id));
  if (!current) {
    errors.general = t("STAMPING_NOT_FOUND", "Stamping not found.");
    return errors;
  }
  if (current.userId.toString() !== String(userId)) {
    errors.general = t(
      "STAMPING_FORBIDDEN",
      "Not authorized to edit this stamping."
    );
    return errors;
  }
  if (current.stampingType !== "in") {
    errors.general = t(
      "STAMPING_EDIT_ONLY_IN",
      "Only 'in' stampings can be edited as a pair."
    );
    return errors;
  }

  // Compute ordering constraints relative to edited arrival
  const prev = await Stamping.findOne({
    userId,
    date: { $lt: arrive },
  })
    .sort({ date: -1 })
    .exec();

  if (prev && !(prev.date < arrive)) {
    errors.arriveDate = t(
      "STAMPING_AFTER_PREV_REQUIRED",
      "Arrival must be after the previous stamping."
    );
  }

  // The paired 'out' candidate is the first out after the (new) arrival
  const pairedOut = await Stamping.findOne({
    userId,
    stampingType: "out",
    date: { $gt: arrive },
  })
    .sort({ date: 1 })
    .exec();

  // If no leave provided on edit, ensure arrival < current paired out (if exists)
  if (!leave && pairedOut && !(arrive < pairedOut.date)) {
    errors.arriveDate = t(
      "STAMPING_COME_BEFORE_GO",
      "Arrival must be before the next 'out' stamping."
    );
  }

  // Compute the first stamping after the (new or existing) 'out'
  const boundaryDate = leave || (pairedOut ? pairedOut.date : null) || arrive;
  const nextAfterOut = await Stamping.findOne({
    userId,
    date: { $gt: boundaryDate },
  })
    .sort({ date: 1 })
    .exec();

  if (leave && nextAfterOut && !(leave < nextAfterOut.date)) {
    errors.leaveDate = t(
      "STAMPING_LEAVE_BEFORE_NEXT",
      "Leave must be before the following stamping."
    );
  }

  return errors;
};

module.exports = { validateStampingData };
