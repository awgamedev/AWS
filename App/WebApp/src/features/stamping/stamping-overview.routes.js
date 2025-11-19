const express = require("express");
const router = express.Router();
const Stamping = require("./stamping.model");
const User = require("../user/user.model");
const { renderView } = require("../../utils/view-renderer");
const { ensureAuthenticated, checkRole } = require("../../middleware/auth");
const {
  formatDate,
  getMonthNameDisplay,
  getMonthDateRange,
} = require("../../utils/date-utils");
const { round } = require("../../utils/math-utils");
const {
  generateMonthOptions,
  generateYearOptions,
} = require("../../utils/dropdown-utils");
const { groupStampingsByUser } = require("./utils/stamping-aggregator");
const { processStampings } = require("./utils/stamping-processor");
const { renderErrorView } = require("../../utils/view-renderer");
/**
 * Build overview data for all users
 */
const buildUserOverviewData = (stampingsByUser, allUsers) => {
  const overviewData = {};
  let totalMonthlyHours = 0;

  for (const userId in stampingsByUser) {
    const userStampings = stampingsByUser[userId];
    const userData = allUsers.find((u) => u._id.toString() === userId);
    const username = userData
      ? userData.username
      : `Unbekannter Benutzer (${userId})`;

    const result = processStampings(userStampings);

    overviewData[userId] = {
      userId,
      username,
      totalHours: result.totalHours,
      dailyWork: result.dailyWork,
    };

    totalMonthlyHours += result.totalHours;
  }

  // Add users without stampings
  allUsers.forEach((user) => {
    const userId = user._id.toString();
    if (!overviewData[userId]) {
      overviewData[userId] = {
        userId,
        username: user.username,
        totalHours: 0,
        dailyWork: {},
      };
    }
  });

  return { overviewData, totalMonthlyHours };
};

// ----------------------------------------------------------------------
// 📍 ROUTE HANDLERS
// ----------------------------------------------------------------------

router.get(
  "/time-tracking/stamping-overview",
  ensureAuthenticated,
  checkRole("admin"),
  async (req, res) => {
    const currentDate = new Date();
    const year = parseInt(req.query.year) || currentDate.getFullYear();
    const month = parseInt(req.query.month) || currentDate.getMonth() + 1;

    const { startDate, endDate } = getMonthDateRange(year, month);

    try {
      const allUsers = await User.find({}).select("_id username").exec();

      const allStampings = await Stamping.find({
        date: { $gte: startDate, $lte: endDate },
      })
        .sort({ userId: 1, date: 1 })
        .exec();

      const stampingsByUser = groupStampingsByUser(allStampings);
      const { overviewData, totalMonthlyHours } = buildUserOverviewData(
        stampingsByUser,
        allUsers
      );

      const sortedUserOverviewData = Object.values(overviewData).sort((a, b) =>
        a.username.localeCompare(b.username)
      );

      renderView(
        req,
        res,
        "stamping_overview_admin",
        `Monatsübersicht Stempelungen`,
        {
          overviewData: sortedUserOverviewData,
          totalMonthlyHours: round(totalMonthlyHours, 2),
          monthName: getMonthNameDisplay(startDate),
          currentYear: year,
          currentMonth: month,
          monthOptions: generateMonthOptions(year, month),
          yearOptions: generateYearOptions(currentDate.getFullYear(), year),
          formatDate,
        }
      );
    } catch (error) {
      console.error("Fehler beim Abrufen der Admin-Übersicht:", error.message);
      return renderErrorView(req, res, "Serverfehler", 500, error.message);
    }
  }
);

module.exports = router;
