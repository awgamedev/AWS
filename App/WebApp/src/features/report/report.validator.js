const Report = require("./report.model");
const reportRepository = require("./report.repository");
const { REPORT_TYPES } = require("./report.model");

/**
 * Validates report data and checks for overlapping reports.
 * @param {Object} req - Express request (expects body, user, __ translator)
 * @param {boolean} isEdit - Whether this is an edit operation
 * @returns {Object} errors keyed by field
 */
async function validateReportData(req, isEdit = false) {
  const errors = {};
  const { type, startDate, endDate, id } = req.body;

  // Validate type
  if (!type || !REPORT_TYPES.includes(type)) {
    errors.type = req.__("ERROR_INVALID_REPORT_TYPE") || "Ungültiger Typ.";
  }

  // Validate dates
  if (!startDate) {
    errors.startDate =
      req.__("ERROR_REPORT_START_REQUIRED") || "Startdatum erforderlich.";
  }
  if (!endDate) {
    errors.endDate =
      req.__("ERROR_REPORT_END_REQUIRED") || "Enddatum erforderlich.";
  }

  let start = null;
  let end = null;
  if (startDate) start = new Date(startDate);
  if (endDate) end = new Date(endDate);

  if (start && end && end < start) {
    errors.dateRange =
      req.__("ERROR_REPORT_RANGE") ||
      "Enddatum muss nach dem Startdatum liegen.";
  }

  // Overlap check only if dates valid so far
  if (
    !errors.startDate &&
    !errors.endDate &&
    !errors.dateRange &&
    start &&
    end
  ) {
    try {
      const overlapping = await reportRepository.findOverlapping(
        req.user.id,
        start,
        end,
        isEdit ? id : null
      );
      if (overlapping.length > 0) {
        errors.overlap =
          req.__("ERROR_REPORT_OVERLAP") ||
          "Zeitraum überschneidet sich mit einem bestehenden Report.";
      }
    } catch (err) {
      req.logger.error("Fehler bei Overlap-Prüfung", err);
      errors.general =
        req.__("ERROR_REPORT_VALIDATION") || "Validierungsfehler.";
    }
  }

  return errors;
}

/**
 * Validates admin report data (when admin creates report for another user)
 * @param {Object} req - Express request (expects body, __ translator)
 * @returns {Object} errors keyed by field
 */
async function validateAdminReportData(req) {
  const errors = {};
  const { userId, type, startDate, endDate } = req.body;

  // Validate userId
  if (!userId) {
    errors.userId = req.__("ERROR_USER_REQUIRED") || "Benutzer erforderlich.";
  }

  // Validate type
  if (!type || !REPORT_TYPES.includes(type)) {
    errors.type = req.__("ERROR_INVALID_REPORT_TYPE") || "Ungültiger Typ.";
  }

  // Validate dates
  if (!startDate) {
    errors.startDate =
      req.__("ERROR_REPORT_START_REQUIRED") || "Startdatum erforderlich.";
  }
  if (!endDate) {
    errors.endDate =
      req.__("ERROR_REPORT_END_REQUIRED") || "Enddatum erforderlich.";
  }

  let start = null;
  let end = null;
  if (startDate) start = new Date(startDate);
  if (endDate) end = new Date(endDate);

  if (start && end && end < start) {
    errors.dateRange =
      req.__("ERROR_REPORT_RANGE") ||
      "Enddatum muss nach dem Startdatum liegen.";
  }

  // Overlap check only if dates and userId are valid
  if (
    !errors.userId &&
    !errors.startDate &&
    !errors.endDate &&
    !errors.dateRange &&
    start &&
    end
  ) {
    try {
      const overlapping = await reportRepository.findOverlapping(
        userId,
        start,
        end,
        null
      );
      if (overlapping.length > 0) {
        errors.overlap =
          req.__("ERROR_REPORT_OVERLAP") ||
          "Zeitraum überschneidet sich mit einem bestehenden Report.";
      }
    } catch (err) {
      req.logger.error("Fehler bei Overlap-Prüfung", err);
      errors.general =
        req.__("ERROR_REPORT_VALIDATION") || "Validierungsfehler.";
    }
  }

  return errors;
}

module.exports = { validateReportData, validateAdminReportData };
