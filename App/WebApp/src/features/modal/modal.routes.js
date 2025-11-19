const express = require("express");
const router = express.Router();
const User = require("../user/user.model");
const { ensureAuthenticated } = require("../../middleware/auth");
const path = require("path");
const { renderModalContent } = require("./modal-utils");

/**
 * GET /api/modal/task-create
 * Returns HTML for the create task modal
 */
router.get("/api/modal/task-create", ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.find({}).select("_id username").lean();
    const viewsPath = path.join(__dirname, "../task/views");

    const html = renderModalContent(
      viewsPath,
      "task_board_create_modal.ejs",
      users,
      req.__
    );

    res.json({ html });
  } catch (error) {
    req.logger.error("Error rendering create task modal:", error);
    res.status(500).json({ error: "Failed to load modal content" });
  }
});

/**
 * GET /api/modal/task-edit
 * Returns HTML for the edit task modal
 */
router.get("/api/modal/task-edit", ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.find({}).select("_id username").lean();
    const viewsPath = path.join(__dirname, "../task/views");

    const html = renderModalContent(
      viewsPath,
      "task_board_edit_modal.ejs",
      users,
      req.__
    );

    res.json({ html });
  } catch (error) {
    req.logger.error("Error rendering edit task modal:", error);
    res.status(500).json({ error: "Failed to load modal content" });
  }
});

/**
 * GET /api/modal/stamping-create
 * Returns HTML for the create stamping modal
 */
router.get(
  "/api/modal/stamping-create",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { userId } = req.query;
      const {
        ALLOWED_STAMPING_REASONS,
      } = require("../stamping/stamping.constants");
      const viewsPath = path.join(__dirname, "../stamping/views");
      const templatePath = path.join(viewsPath, "stamping_create_modal.ejs");
      const template = require("fs").readFileSync(templatePath, "utf-8");
      const ejs = require("ejs");

      const html = ejs.render(template, {
        userId,
        allowedReasons: ALLOWED_STAMPING_REASONS,
        __: req.__,
      });

      res.json({ html });
    } catch (error) {
      req.logger.error("Error rendering create stamping modal:", error);
      res.status(500).json({ error: "Failed to load modal content" });
    }
  }
);

/**
 * GET /api/modal/stamping-delete
 * Returns HTML for the delete stamping confirmation modal
 */
router.get(
  "/api/modal/stamping-delete",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { inId, outId, pairDisplay } = req.query;
      const viewsPath = path.join(__dirname, "../stamping/views");
      const templatePath = path.join(viewsPath, "stamping_delete_modal.ejs");
      const template = require("fs").readFileSync(templatePath, "utf-8");
      const ejs = require("ejs");

      const html = ejs.render(template, {
        inId,
        outId,
        pairDisplay,
        __: req.__,
      });

      res.json({ html });
    } catch (error) {
      req.logger.error("Error rendering delete stamping modal:", error);
      res.status(500).json({ error: "Failed to load modal content" });
    }
  }
);

module.exports = router;
