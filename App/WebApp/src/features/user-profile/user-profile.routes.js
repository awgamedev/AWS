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

// Profile editing routes removed per request (no update/upload endpoints)

module.exports = router;
