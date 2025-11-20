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
  const startOfWeek = getStartOfWeek(new Date());
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
      },
      '<link rel="stylesheet" href="/css/task-board.css">'
    );
  } catch (error) {
    req.logger.error("Error while fetching task board:", error);
    return renderErrorView(req, res, "TASK_LOAD_ERROR", 500, error.message);
  }
});

// API Routes
router.post("/api/tasks", ensureAuthenticated, taskController.createTask);
router.put("/api/tasks/:id", ensureAuthenticated, taskController.updateTask);
router.delete("/api/tasks/:id", ensureAuthenticated, taskController.deleteTask);

module.exports = router;
