const User = require("./user.model");
const userProfileRepository = require("../user-profile/user-profile.repository");
const { renderView, renderErrorView } = require("../../utils/view-renderer");
const { hashPassword } = require("../../utils/password-utils");
const { validateUserDetailsData } = require("./user.validations");

/**
 * Controller for user operations
 */
class UserController {
  /**
   * Display the user details page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async showUserDetails(req, res) {
    const userId = req.params.id;
    const title = req.__("USER_DETAILS_PAGE_TITLE");

    try {
      const user = await User.findById(userId);
      if (!user) {
        return renderErrorView(req, res, "USER_NOT_FOUND", 404);
      }

      // Get or create user profile
      const userProfile = await userProfileRepository.getOrCreate(userId);

      renderView(req, res, "user_details", title, {
        user: user.toObject(),
        userProfile,
        errors: {},
      });
    } catch (err) {
      req.logger.error("Error fetching user details:", err);
      return renderErrorView(req, res, "USER_DETAILS_LOAD_ERROR", 500);
    }
  }

  /**
   * Update user details (both user and user profile)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUserDetails(req, res) {
    const userId = req.params.id;
    const {
      username,
      email,
      password,
      role,
      pauseInMinutesPerDay,
      vacationDaysPerYear,
    } = req.body;
    const title = req.__("USER_DETAILS_PAGE_TITLE");

    try {
      const user = await User.findById(userId);
      if (!user) {
        return renderErrorView(req, res, "USER_NOT_FOUND", 404);
      }

      // Validate user details
      const validationErrors = await validateUserDetailsData(
        req,
        userId,
        username,
        password,
        email,
        pauseInMinutesPerDay,
        vacationDaysPerYear
      );

      // If there are validation errors, re-render the form with errors
      if (Object.keys(validationErrors).length > 0) {
        const userProfile = await userProfileRepository.getOrCreate(userId);
        return renderView(req, res, "user_details", title, {
          user: {
            _id: userId,
            username,
            email,
            role: role || "user",
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          userProfile: {
            ...userProfile,
            pauseInMinutesPerDay:
              pauseInMinutesPerDay !== ""
                ? pauseInMinutesPerDay
                : userProfile.pauseInMinutesPerDay,
            vacationDaysPerYear: vacationDaysPerYear || 20,
          },
          errors: validationErrors,
        });
      }

      // Update user information
      user.username = username;
      user.email = email;
      user.role = role || "user";

      if (password) {
        user.password = await hashPassword(password);
      }

      await user.save();

      // Update user profile
      const profileUpdateData = {
        vacationDaysPerYear: parseInt(vacationDaysPerYear) || 20,
      };

      // Only set pauseInMinutesPerDay if provided
      if (pauseInMinutesPerDay !== "") {
        profileUpdateData.pauseInMinutesPerDay =
          parseInt(pauseInMinutesPerDay) || null;
      } else {
        profileUpdateData.pauseInMinutesPerDay = null;
      }

      await userProfileRepository.updateByUserId(userId, profileUpdateData);

      res.redirect("/user/list");
    } catch (err) {
      req.logger.error("Error updating user details:", err);
      return renderErrorView(
        req,
        res,
        "USER_DETAILS_UPDATE_ERROR",
        500,
        err.message
      );
    }
  }
}

module.exports = new UserController();
