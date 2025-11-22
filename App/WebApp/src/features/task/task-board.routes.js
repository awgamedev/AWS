const express = require("express");
const router = express.Router();
const User = require("../user/user.model");
const UserProfile = require("../user-profile/user-profile.model");
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
 * GET Route: Display combined task view (/task-list)
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

    // Load user profiles for profile pictures
    const userProfiles = await UserProfile.find({}).lean();
    const profileMap = {};
    userProfiles.forEach((profile) => {
      profileMap[profile.userId.toString()] = profile;
    });

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

    // Render combined view with mobile-optimized styles
    renderView(
      req,
      res,
      "tasks",
      title,
      {
        users,
        tasksByDayAndUser,
        daysOfWeek,
        weekRange: formatWeekRange(startOfWeek),
        weekOffset,
        profileMap,
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

    // Load user profiles for profile pictures
    const userProfiles = await UserProfile.find({}).lean();
    const profileMap = {};
    userProfiles.forEach((profile) => {
      profileMap[profile.userId.toString()] = profile;
    });

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
          profileMap,
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

/**
 * API Route: Get list view data for tasks filtered by week (returns rendered HTML)
 */
router.get("/api/task-list/view", ensureAuthenticated, async (req, res) => {
  req.logger.info(
    `API: task-list/view called with offset: ${req.query.offset}`
  );

  try {
    const Task = require("./task.model");

    // Get week offset from query parameter
    const weekOffset = parseInt(req.query.offset) || 0;
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    const startOfWeek = getStartOfWeek(baseDate);
    const endOfWeek = addDays(startOfWeek, 7);

    // Define priority order for sorting
    const priorityOrder = { high: 1, medium: 2, low: 3 };

    // Fetch tasks for the specified week
    const allTasks = await Task.find({
      $or: [
        // Tasks that start within the week
        {
          startDate: {
            $gte: startOfWeek,
            $lt: endOfWeek,
          },
        },
        // Tasks that end within the week
        {
          endDate: {
            $gte: startOfWeek,
            $lt: endOfWeek,
          },
        },
        // Tasks that span across the entire week
        {
          startDate: { $lt: startOfWeek },
          $or: [{ endDate: { $gte: endOfWeek } }, { endDate: null }],
        },
      ],
    })
      .lean()
      .exec();

    // Sort tasks: unassigned first, then by userId, then by priority
    allTasks.sort((a, b) => {
      // Sort by assignment status (unassigned first)
      if (a.userId === null && b.userId !== null) return -1;
      if (b.userId === null && a.userId !== null) return 1;

      // Sort by userId if both are assigned
      if (a.userId !== null && b.userId !== null) {
        const userIdComparison = String(a.userId).localeCompare(
          String(b.userId)
        );
        if (userIdComparison !== 0) return userIdComparison;
      }

      // Sort by priority
      return priorityOrder[a.taskPriority] - priorityOrder[b.taskPriority];
    });

    // Fetch all users and create user map
    const users = await User.find({}).select("_id username").lean().exec();
    const userMap = users.reduce((map, user) => {
      map[user._id.toString()] = user.username;
      return map;
    }, {});

    // Fetch user profiles for profile pictures
    const UserProfile = require("../user-profile/user-profile.model");
    const userProfiles = await UserProfile.find({}).lean();
    const profileMap = {};
    userProfiles.forEach((profile) => {
      profileMap[profile.userId.toString()] = profile;
    });

    // Enrich tasks with username and formatted date
    const enrichedTasks = allTasks.map((task) => ({
      ...task,
      assignedUsername:
        userMap[task.userId?.toString()] || req.__("UNASSIGNED"),
      dateStr: task.startDate.toLocaleDateString("de-DE"),
    }));

    // Render the partial view
    const html = await new Promise((resolve, reject) => {
      req.app.render(
        "task_list_content",
        {
          allTasks: enrichedTasks,
          profileMap,
          __: req.__,
        },
        (err, html) => {
          if (err) {
            req.logger.error("Error rendering task_list_content:", err);
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
    req.logger.error("Error fetching task list view data:", error);
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
