const userProfileRepository = require("./user-profile.repository");
const UserRepository = require("../user/user.repository");
const reportRepository = require("../report/report.repository");
const { renderView, renderErrorView } = require("../../utils/view-renderer");
const { validateUserProfileData } = require("./user-profile.validator");

const userRepository = new UserRepository();

/**
 * Controller for user profile operations
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
      // Include pending + approved to show all requested days
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

      const title = req.__("USER_PROFILE_TITLE") || "User Profile";

      renderView(req, res, "user-profile", title, {
        user,
        userProfile,
        vacationDaysUsed,
        sickDaysUsed,
        vacationDaysRemaining,
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
   * Update user profile data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { pauseInMinutesPerDay, vacationDaysPerYear } = req.body;

      // Validate the profile data
      const validationErrors = await validateUserProfileData(req);

      // If there are validation errors, return them
      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({
          success: false,
          msg: req.__("INVALID_PROFILE_DATA") || "Invalid profile data.",
          errors: validationErrors,
        });
      }

      // Prepare update data
      const updateData = {
        vacationDaysPerYear: parseInt(vacationDaysPerYear),
      };

      // Only include pauseInMinutesPerDay if provided
      if (
        pauseInMinutesPerDay !== null &&
        pauseInMinutesPerDay !== undefined &&
        pauseInMinutesPerDay !== ""
      ) {
        updateData.pauseInMinutesPerDay = parseInt(pauseInMinutesPerDay);
      }

      // Update the profile
      const updatedProfile = await userProfileRepository.updateByUserId(
        userId,
        updateData
      );

      if (!updatedProfile) {
        // If profile doesn't exist, create it
        updateData.userId = userId;
        await userProfileRepository.create(updateData);
      }

      return res.json({
        success: true,
        msg:
          req.__("PROFILE_UPDATED_SUCCESS") || "Profile updated successfully.",
      });
    } catch (error) {
      req.logger.error("Error updating user profile:", error);
      return res.status(500).json({
        success: false,
        msg: req.__("PROFILE_UPDATE_ERROR") || "Error updating profile.",
        error: error.message,
      });
    }
  }

  /**
   * Upload profile picture
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadProfilePicture(req, res) {
    try {
      const userId = req.user.id;
      const { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          msg: req.__("NO_IMAGE_PROVIDED") || "No image provided.",
        });
      }

      // Validate base64 format
      if (!imageBase64.startsWith("data:image/")) {
        return res.status(400).json({
          success: false,
          msg: req.__("INVALID_IMAGE_FORMAT") || "Invalid image format.",
        });
      }

      // Update profile picture
      await userProfileRepository.updateProfilePicture(userId, imageBase64);

      return res.json({
        success: true,
        msg:
          req.__("PROFILE_PICTURE_UPDATED") ||
          "Profile picture updated successfully.",
      });
    } catch (error) {
      req.logger.error("Error uploading profile picture:", error);
      return res.status(500).json({
        success: false,
        msg:
          req.__("PROFILE_PICTURE_ERROR") || "Error uploading profile picture.",
        error: error.message,
      });
    }
  }
}

module.exports = new UserProfileController();
