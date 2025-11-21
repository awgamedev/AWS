const BaseRepository = require("../../repositories/baseRepository");
const Report = require("./report.model");

class ReportRepository extends BaseRepository {
  constructor() {
    super(Report);
  }

  /**
   * Finds reports for a user that overlap with a given date range.
   * @param {string} userId
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {string|null} excludeId - existing report id to exclude (on edit)
   */
  async findOverlapping(userId, startDate, endDate, excludeId = null) {
    const query = {
      userId,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return await this.model.find(query).exec();
  }

  /**
   * Gets all reports within a date range (inclusive) optionally filtered by user.
   */
  async findInRange(startDate, endDate, userId = null) {
    const query = {
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    };
    if (userId) query.userId = userId;
    return await this.model.find(query).populate("userId").exec();
  }

  /**
   * Calculates the number of business days between two dates (inclusive).
   * Excludes weekends (Saturday and Sunday).
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {number} Number of business days
   */
  calculateBusinessDays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Gets the total vacation days used by a user in the current year.
   * Only counts approved vacation reports.
   * @param {string} userId
   * @param {number} year - Optional year, defaults to current year
   * @returns {Promise<number>} Total vacation days used
   */
  async getVacationDaysUsed(userId, year = null) {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const reports = await this.model
      .find({
        userId,
        type: "vacation",
        status: "approved",
        startDate: { $lte: endOfYear },
        endDate: { $gte: startOfYear },
      })
      .exec();

    let totalDays = 0;
    for (const report of reports) {
      const rangeStart =
        report.startDate > startOfYear ? report.startDate : startOfYear;
      const rangeEnd = report.endDate < endOfYear ? report.endDate : endOfYear;
      totalDays += this.calculateBusinessDays(rangeStart, rangeEnd);
    }

    return totalDays;
  }

  /**
   * Gets the total sick days used by a user in the current year.
   * Only counts approved illness reports.
   * @param {string} userId
   * @param {number} year - Optional year, defaults to current year
   * @returns {Promise<number>} Total sick days used
   */
  async getSickDaysUsed(userId, year = null) {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const reports = await this.model
      .find({
        userId,
        type: "illness",
        status: "approved",
        startDate: { $lte: endOfYear },
        endDate: { $gte: startOfYear },
      })
      .exec();

    let totalDays = 0;
    for (const report of reports) {
      const rangeStart =
        report.startDate > startOfYear ? report.startDate : startOfYear;
      const rangeEnd = report.endDate < endOfYear ? report.endDate : endOfYear;
      totalDays += this.calculateBusinessDays(rangeStart, rangeEnd);
    }

    return totalDays;
  }
}

module.exports = new ReportRepository();
