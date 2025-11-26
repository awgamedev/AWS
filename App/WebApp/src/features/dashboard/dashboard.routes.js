const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../../middleware/auth");
const { renderView } = require("../../utils/view-renderer");
const Stamping = require("../stamping/stamping.model");
const User = require("../user/user.model");

/**
 * Dashboard Route (GET /dashboard)
 * Shows high level system widgets (users, stampings) and recent activity.
 * Uses the shared renderView utility to inject the dashboard view into the layout.
 */
router.get("/dashboard", ensureAuthenticated, async (req, res, next) => {
  try {
    // Parallel DB queries for efficiency
    const [userCount, stampingCount, recentStampings] = await Promise.all([
      User.countDocuments(),
      Stamping.countDocuments(),
      Stamping.find()
        .sort({ date: -1 })
        .limit(10)
        .populate("userId", "username")
        .lean(),
    ]);

    // Dashboard metrics (easily extendable: add icon + color for each card)
    const metrics = [
      {
        key: "users",
        label: req.__("DASHBOARD_USERS") || "Users",
        value: userCount,
        icon: "fa-users",
        color: "indigo",
      },
      {
        key: "stampings",
        label: req.__("DASHBOARD_STAMPINGS"),
        value: stampingCount,
        icon: "fa-clock",
        color: "emerald",
      },
    ];

    // Transform recent stampings for display (keep view logic light)
    const stampingsView = recentStampings.map((s) => ({
      id: s._id,
      user: s.userId?.username || "-",
      type: s.stampingType,
      reason: s.stampingReason || "-",
      date: s.date,
    }));

    renderView(
      req,
      res,
      "dashboard",
      req.__("APP_DASHBOARD_TITLE") || "Dashboard",
      {
        metrics,
        recentStampings: stampingsView,
      },
      // Additional styles hook (dashboard specific)
      '<link rel="stylesheet" href="/css/dashboard.css">'
    );
  } catch (err) {
    req.logger && req.logger.error("Error loading dashboard", err);
    return next(err);
  }
});

// --- A simple API route (GET /api/status) ---
// API routes do not need the HTML layout
router.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    message: "The server is healthy and responding.",
    timestamp: new Date().toISOString(),
  });
});

// Export the router
module.exports = router;

/**
 * Potential refactoring targets (following routes instructions):
 * - Controller: move dashboard aggregation to `src/controllers/dashboardController.js`
 * - Service: encapsulate stamping/user metric logic in `src/services/dashboardService.js`
 * - Views: keep EJS partials for widgets in `src/views/partials/dashboard/*`
 * - Utilities: shared date formatting could move to a util `src/utils/date.js`
 */
