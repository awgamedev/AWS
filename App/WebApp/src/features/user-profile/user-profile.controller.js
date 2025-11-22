const userProfileRepository = require("./user-profile.repository");
const UserRepository = require("../user/user.repository");
const reportRepository = require("../report/report.repository");
const { renderView, renderErrorView } = require("../../utils/view-renderer");

const userRepository = new UserRepository();

/**
 * Controller for user profile operations (read-only)
 */
class UserProfileController {
  /**
   * Display the user profile page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async showProfile(req, res) {
    try {
      const userId = req.user.id;

      // Get or create user profile
      const userProfile = await userProfileRepository.getOrCreate(userId);
      const user = await userRepository.findById(userId);

      // Calculate used vacation and sick days for current year
      const vacationDaysUsed = await reportRepository.getVacationDaysUsed(
        userId,
        null,
        ["approved", "pending"]
      );
      const sickDaysUsed = await reportRepository.getSickDaysUsed(userId);

      // Calculate remaining days
      const vacationDaysTotal = userProfile.vacationDaysPerYear || 20;
      const vacationDaysRemaining = Math.max(
        0,
        vacationDaysTotal - vacationDaysUsed
      );

      // Fetch user's own reports for embedding in profile page
      const items = await reportRepository.model
        .find({ userId })
        .sort({ startDate: 1 })
        .exec();

      const title = req.__("USER_PROFILE_TITLE") || "User Profile";

      renderView(req, res, "user-profile", title, {
        user,
        userProfile,
        vacationDaysUsed,
        sickDaysUsed,
        vacationDaysRemaining,
        items: items.map((i) => i.toObject()),
      });
    } catch (error) {
      req.logger.error("Error loading user profile:", error);
      return renderErrorView(
        req,
        res,
        "USER_PROFILE_LOAD_ERROR",
        500,
        error.message
      );
    }
  }
}

module.exports = new UserProfileController();
