const express = require("express");
const router = express.Router();
const { ensureAuthenticated, checkRole } = require("../../middleware/auth");
const taskTemplateController = require("./task-template.controller");

// Page route: Display task templates management page
// Page route: only admin may see template management page
router.get(
  "/task/templates",
  ensureAuthenticated,
  checkRole("admin"),
  taskTemplateController.showTemplatesPage
);

// API routes for task templates
router.get(
  "/api/task-templates",
  ensureAuthenticated,
  taskTemplateController.getAllTemplates
);

router.get(
  "/api/task-templates/:id",
  ensureAuthenticated,
  taskTemplateController.getTemplateById
);

// Create template (admin only)
router.post(
  "/api/task-templates",
  ensureAuthenticated,
  checkRole("admin"),
  taskTemplateController.createTemplate
);

// Update template (admin only)
router.put(
  "/api/task-templates/:id",
  ensureAuthenticated,
  checkRole("admin"),
  taskTemplateController.updateTemplate
);

// Delete template (admin only)
router.delete(
  "/api/task-templates/:id",
  ensureAuthenticated,
  checkRole("admin"),
  taskTemplateController.deleteTemplate
);

module.exports = router;
