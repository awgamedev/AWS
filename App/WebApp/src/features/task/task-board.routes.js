const express = require("express");
const router = express.Router();
const User = require("../user/user.model");
const { ensureAuthenticated } = require("../../middleware/auth");
const taskController = require("./task.controller");
const { renderView, renderErrorView } = require("../../utils/view-renderer");
const {
  getDaysOfTheWeek,
  getStartOfWeek,
  addDays,
  formatWeekRange,
  getEndOfDisplayedWeek,
} = require("../../utils/date-utils");
const { fetchTasksForWeek, groupTasksByDayAndUser } = require("./task-utils");

// ============================================================================
// HELPER METHODS
// ============================================================================

/**
 * Creates a map of user IDs to usernames
 */
function createUserMap(users) {
  return users.reduce((map, user) => {
    map[user._id.toString()] = user.username;
    return map;
  }, {});
}

/**
 * GET Route: Display task board (/task-list)
 */
router.get("/task/task-list", ensureAuthenticated, async (req, res) => {
  const title = req.__("TASK_BOARD_PAGE_TITLE");
  const daysOfWeek = getDaysOfTheWeek();

  // Get week offset from query parameter (default to 0 for current week)
  const weekOffset = parseInt(req.query.week) || 0;
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);

  const startOfWeek = getStartOfWeek(baseDate);
  const endOfDisplayedWeek = getEndOfDisplayedWeek(startOfWeek);

  try {
    // Fetch users
    const users = await User.find({}).select("_id username").lean();
    const userMap = createUserMap(users);

    // Fetch tasks
    const tasks = await fetchTasksForWeek(startOfWeek, addDays(startOfWeek, 7));

    // Group tasks
    const tasksByDayAndUser = groupTasksByDayAndUser(
      tasks,
      userMap,
      startOfWeek,
      endOfDisplayedWeek,
      daysOfWeek
    );

    // Render view with mobile-optimized styles
    renderView(
      req,
      res,
      "task_board",
      title,
      {
        users,
        tasksByDayAndUser,
        daysOfWeek,
        weekRange: formatWeekRange(startOfWeek),
        weekOffset,
      },
      '<link rel="stylesheet" href="/css/task-board.css">'
    );
  } catch (error) {
    req.logger.error("Error while fetching task board:", error);
    return renderErrorView(req, res, "TASK_LOAD_ERROR", 500, error.message);
  }
});

/**
 * API Route: Get week data for task board (returns rendered HTML)
 */
router.get("/api/task-board/week", ensureAuthenticated, async (req, res) => {
  req.logger.info(
    `API: task-board/week called with offset: ${req.query.offset}`
  );
  const daysOfWeek = getDaysOfTheWeek();

  // Get week offset from query parameter
  const weekOffset = parseInt(req.query.offset) || 0;
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);

  const startOfWeek = getStartOfWeek(baseDate);
  const endOfDisplayedWeek = getEndOfDisplayedWeek(startOfWeek);

  try {
    // Fetch users
    const users = await User.find({}).select("_id username").lean();
    const userMap = createUserMap(users);

    // Fetch tasks
    const tasks = await fetchTasksForWeek(startOfWeek, addDays(startOfWeek, 7));

    // Group tasks
    const tasksByDayAndUser = groupTasksByDayAndUser(
      tasks,
      userMap,
      startOfWeek,
      endOfDisplayedWeek,
      daysOfWeek
    );

    // Render the partial view
    const html = await new Promise((resolve, reject) => {
      req.app.render(
        "task_board_content",
        {
          users,
          tasksByDayAndUser,
          daysOfWeek,
          __: req.__,
        },
        (err, html) => {
          if (err) {
            req.logger.error("Error rendering task_board_content:", err);
            reject(err);
          } else {
            resolve(html);
          }
        }
      );
    });

    res.json({
      ok: true,
      html,
      weekRange: formatWeekRange(startOfWeek),
      weekOffset,
    });
  } catch (error) {
    req.logger.error("Error fetching task board week data:", error);
    res.status(500).json({
      ok: false,
      msg: req.__("TASK_LOAD_ERROR") || "Error loading tasks",
    });
  }
});

// API Routes
router.post("/api/tasks", ensureAuthenticated, taskController.createTask);
router.put("/api/tasks/:id", ensureAuthenticated, taskController.updateTask);
router.delete("/api/tasks/:id", ensureAuthenticated, taskController.deleteTask);

module.exports = router;
