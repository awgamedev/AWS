const express = require("express");
const router = express.Router();
const { ensureAuthenticated, checkRole } = require("../../middleware/auth");
const {
  listUserReports,
  createReportAPI,
  updateReportAPI,
  showAdminCalendar,
  listAllReportsJSON,
  listAllReportsHTML,
  approveReport,
  rejectReport,
  createReportByAdminAPI,
} = require("./report.controller");

// User routes
router.get("/reports/my", ensureAuthenticated, listUserReports);

// API routes
router.post("/api/reports", ensureAuthenticated, createReportAPI);
router.put("/api/reports/:id", ensureAuthenticated, updateReportAPI);

// Admin calendar view
router.get(
  "/reports/admin",
  ensureAuthenticated,
  checkRole("admin"),
  showAdminCalendar
);
router.get(
  "/reports/admin/list",
  ensureAuthenticated,
  checkRole("admin"),
  listAllReportsJSON
);
router.get(
  "/reports/admin/list-view",
  ensureAuthenticated,
  checkRole("admin"),
  listAllReportsHTML
);

// Admin actions
router.post(
  "/reports/:id/approve",
  ensureAuthenticated,
  checkRole("admin"),
  approveReport
);
router.post(
  "/reports/:id/reject",
  ensureAuthenticated,
  checkRole("admin"),
  rejectReport
);

// Admin create report for any user
router.post(
  "/api/reports/admin",
  ensureAuthenticated,
  checkRole("admin"),
  createReportByAdminAPI
);

module.exports = router;
