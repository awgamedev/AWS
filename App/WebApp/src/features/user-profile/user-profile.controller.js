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

      // Fetch user's own future reports for embedding in profile page
      const items = await reportRepository.getFutureReports(userId);

      const title = req.__("USER_PROFILE_TITLE");

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

  /**
   * Upload profile picture
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadProfilePicture(req, res) {
    try {
      // Allow admin to upload for other users, otherwise use current user
      const userId = req.body.userId || req.user.id;
      const { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          msg: req.__("NO_IMAGE_PROVIDED"),
        });
      }

      // Validate base64 format
      if (!imageBase64.startsWith("data:image/")) {
        return res.status(400).json({
          success: false,
          msg: req.__("INVALID_IMAGE_FORMAT"),
        });
      }

      // Update profile picture
      await userProfileRepository.updateProfilePicture(userId, imageBase64);

      return res.json({
        success: true,
        msg: req.__("PROFILE_PICTURE_UPDATED"),
      });
    } catch (error) {
      req.logger.error("Error uploading profile picture:", error);
      return res.status(500).json({
        success: false,
        msg: req.__("PROFILE_PICTURE_ERROR"),
        error: error.message,
      });
    }
  }

  /**
   * Remove profile picture
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeProfilePicture(req, res) {
    try {
      // Allow admin to remove for other users, otherwise use current user
      const userId = req.body.userId || req.user.id;
      await userProfileRepository.removeProfilePicture(userId);
      return res.json({
        success: true,
        msg: req.__("PROFILE_PICTURE_REMOVED"),
      });
    } catch (error) {
      req.logger.error("Error removing profile picture:", error);
      return res.status(500).json({
        success: false,
        msg: req.__("PROFILE_PICTURE_REMOVE_ERROR"),
        error: error.message,
      });
    }
  }

  /**
   * Admin: Update user profile settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUserProfile(req, res) {
    try {
      const userId = req.params.userId;
      const { pauseInMinutesPerDay, vacationDaysPerYear } = req.body;

      // Validate profile data
      const { validateProfileData } = require("./user-profile.validator");
      const validationErrors = await validateProfileData(
        req,
        pauseInMinutesPerDay,
        vacationDaysPerYear
      );

      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({
          success: false,
          errors: validationErrors,
        });
      }

      // Prepare update data
      const profileUpdateData = {
        vacationDaysPerYear: parseInt(vacationDaysPerYear) || 20,
      };

      // Only set pauseInMinutesPerDay if provided
      if (pauseInMinutesPerDay !== "" && pauseInMinutesPerDay !== null) {
        profileUpdateData.pauseInMinutesPerDay =
          parseInt(pauseInMinutesPerDay) || null;
      } else {
        profileUpdateData.pauseInMinutesPerDay = null;
      }

      // Update profile
      await userProfileRepository.updateByUserId(userId, profileUpdateData);

      return res.json({
        success: true,
        msg: req.__("USER_PROFILE_UPDATED"),
      });
    } catch (error) {
      req.logger.error("Error updating user profile:", error);
      return res.status(500).json({
        success: false,
        msg: req.__("USER_PROFILE_UPDATE_ERROR"),
        error: error.message,
      });
    }
  }
}

module.exports = new UserProfileController();
