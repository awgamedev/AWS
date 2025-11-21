const Report = require("./report.model");
const reportRepository = require("./report.repository");
const userProfileRepository = require("../user-profile/user-profile.repository");
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
    errors.type = req.__("ERROR_INVALID_REPORT_TYPE");
  }

  // Validate dates
  if (!startDate) {
    errors.startDate = req.__("ERROR_REPORT_START_REQUIRED");
  }
  if (!endDate) {
    errors.endDate = req.__("ERROR_REPORT_END_REQUIRED");
  }

  let start = null;
  let end = null;
  if (startDate) start = new Date(startDate);
  if (endDate) end = new Date(endDate);

  if (start && end && end < start) {
    errors.dateRange = req.__("ERROR_REPORT_RANGE");
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
        errors.overlap = req.__("ERROR_REPORT_OVERLAP");
      }
    } catch (err) {
      req.logger.error("Fehler bei Overlap-Prüfung", err);
      errors.general = req.__("ERROR_REPORT_VALIDATION");
    }
  }

  // Check remaining vacation days if creating a vacation report
  if (
    !errors.startDate &&
    !errors.endDate &&
    !errors.dateRange &&
    !errors.overlap &&
    type === "vacation" &&
    start &&
    end
  ) {
    try {
      const requestedDays = reportRepository.calculateBusinessDays(start, end);
      const profile = await userProfileRepository.findByUserId(req.user.id);
      const totalVacation = (profile && profile.vacationDaysPerYear) || 20;
      // Include both approved and pending to prevent exceeding allowance with multiple pending requests
      const usedVacation = await reportRepository.getVacationDaysUsed(
        req.user.id,
        null,
        ["approved", "pending"]
      );
      const remaining = Math.max(0, totalVacation - usedVacation);
      if (requestedDays > remaining) {
        errors.vacationDaysRemaining = req.__("ERROR_NOT_ENOUGH_VACATION_DAYS");
      }
    } catch (err) {
      req.logger.error("Fehler bei Urlaubs-Tage-Prüfung", err);
      errors.general = req.__("ERROR_REPORT_VALIDATION");
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
    errors.userId = req.__("ERROR_USER_REQUIRED");
  }

  // Validate type
  if (!type || !REPORT_TYPES.includes(type)) {
    errors.type = req.__("ERROR_INVALID_REPORT_TYPE");
  }

  // Validate dates
  if (!startDate) {
    errors.startDate = req.__("ERROR_REPORT_START_REQUIRED");
  }
  if (!endDate) {
    errors.endDate = req.__("ERROR_REPORT_END_REQUIRED");
  }

  let start = null;
  let end = null;
  if (startDate) start = new Date(startDate);
  if (endDate) end = new Date(endDate);

  if (start && end && end < start) {
    errors.dateRange = req.__("ERROR_REPORT_RANGE");
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
        errors.overlap = req.__("ERROR_REPORT_OVERLAP");
      }
    } catch (err) {
      req.logger.error("Fehler bei Overlap-Prüfung", err);
      errors.general = req.__("ERROR_REPORT_VALIDATION");
    }
  }

  // Check remaining vacation days for admin-created vacation reports
  if (
    !errors.userId &&
    !errors.startDate &&
    !errors.endDate &&
    !errors.dateRange &&
    !errors.overlap &&
    type === "vacation" &&
    start &&
    end
  ) {
    try {
      const requestedDays = reportRepository.calculateBusinessDays(start, end);
      const profile = await userProfileRepository.findByUserId(userId);
      const totalVacation = (profile && profile.vacationDaysPerYear) || 20;
      // Include both approved and pending requests for admin validation
      const usedVacation = await reportRepository.getVacationDaysUsed(
        userId,
        null,
        ["approved", "pending"]
      );
      const remaining = Math.max(0, totalVacation - usedVacation);
      if (requestedDays > remaining) {
        errors.vacationDaysRemaining = req.__("ERROR_NOT_ENOUGH_VACATION_DAYS");
      }
    } catch (err) {
      req.logger.error("Fehler bei Urlaubs-Tage-Prüfung (Admin)", err);
      errors.general = req.__("ERROR_REPORT_VALIDATION");
    }
  }

  return errors;
}

module.exports = { validateReportData, validateAdminReportData };
