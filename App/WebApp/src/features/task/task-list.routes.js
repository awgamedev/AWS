// filepath: c:\Users\andre\Desktop\AWS\App\WebApp\src\routes\task-list.js
const express = require("express");
const router = express.Router();
const Task = require("./task.model");
const User = require("../user/user.model");
const { ensureAuthenticated } = require("../../middleware/auth");
const { renderView, renderErrorView } = require("../../utils/view-renderer");

/**
 * GET /task-backlog
 * Display task backlog with all tasks sorted by assignment status, user, and priority
 */
router.get("/task/task-backlog", ensureAuthenticated, async (req, res) => {
  const title = req.__("TASK_BACKLOG_PAGE_TITLE");

  try {
    // Define priority order for sorting
    const priorityOrder = { high: 1, medium: 2, low: 3 };

    // Fetch all tasks
    const allTasks = await Task.find({}).lean().exec();

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

    // Enrich tasks with username and formatted date
    const enrichedTasks = allTasks.map((task) => ({
      ...task,
      assignedUsername:
        userMap[task.userId?.toString()] || req.__("UNASSIGNED"),
      dateStr: task.startDate.toLocaleDateString("de-DE"),
    }));

    renderView(req, res, "all_tasks", title, {
      allTasks: enrichedTasks,
      users: users,
    });
  } catch (err) {
    req.logger.error("Error fetching task backlog:", err);
    return renderErrorView(req, res, "TASK_BACKLOG_LOAD_ERROR", 500);
  }
});

/**
 * POST /task-backlog/assign
 * Assign a task to a specific user
 */
router.post("/task-backlog/assign", ensureAuthenticated, async (req, res) => {
  const { taskId, userId } = req.body;

  try {
    // Validate input
    if (!taskId || !userId) {
      return res.status(400).json({
        msg: req.__("MISSING_TASK_OR_USER_ID"),
      });
    }

    // Update task with assignment
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        userId: userId,
        modifiedAt: Date.now(),
        modifiedBy: req.user.username || req.user.id,
        taskStatus: "pending",
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        msg: req.__("TASK_NOT_FOUND"),
      });
    }

    res.status(200).json({
      msg: req.__("TASK_ASSIGNED_SUCCESS", updatedTask.taskName),
      task: updatedTask,
    });
  } catch (err) {
    req.logger.error("Error assigning task:", err);
    res.status(500).json({
      msg: req.__("TASK_ASSIGN_ERROR"),
    });
  }
});

module.exports = router;
