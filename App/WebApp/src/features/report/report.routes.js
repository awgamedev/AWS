const express = require("express");
const router = express.Router();
const { ensureAuthenticated, checkRole } = require("../../middleware/auth");
const {
  showCreateForm,
  listUserReports,
  createReport,
  showAdminCalendar,
  listAllReportsJSON,
  approveReport,
  rejectReport,
} = require("./report.controller");

// User routes
router.get("/reports/create", ensureAuthenticated, showCreateForm);
router.post("/reports/create", ensureAuthenticated, createReport);
router.get("/reports/my", ensureAuthenticated, listUserReports);

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

module.exports = router;
