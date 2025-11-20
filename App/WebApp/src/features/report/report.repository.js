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
}

module.exports = new ReportRepository();
