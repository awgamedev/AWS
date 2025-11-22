const express = require("express");
const router = express.Router();
const { ensureAuthenticated, checkRole } = require("../../middleware/auth");
const userProfileController = require("./user-profile.controller");

/**
 * User Profile Routes
 * Handles all routes related to user profile management
 */

// Display user profile page (GET /profile)
router.get("/profile", ensureAuthenticated, (req, res) => {
  userProfileController.showProfile(req, res);
});

// Upload profile picture (POST /profile/upload-picture)
router.post("/profile/upload-picture", ensureAuthenticated, (req, res) => {
  userProfileController.uploadProfilePicture(req, res);
});

// Remove profile picture (POST /profile/remove-picture)
router.post("/profile/remove-picture", ensureAuthenticated, (req, res) => {
  userProfileController.removeProfilePicture(req, res);
});

// Admin: Update user profile settings (POST /admin/user-profile/:userId)
router.post("/admin/user-profile/:userId", ensureAuthenticated, (req, res) => {
  userProfileController.updateUserProfile(req, res);
});

module.exports = router;
