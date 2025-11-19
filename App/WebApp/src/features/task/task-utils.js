const Task = require("./task.model");
const { addDays } = require("../../utils/date-utils");

/**
 * Fetches tasks within the week range
 */
async function fetchTasksForWeek(startOfWeek, endOfDisplayedWeek) {
  return await Task.find({
    $or: [
      { startDate: { $lt: endOfDisplayedWeek } },
      { endDate: null, startDate: { $lt: endOfDisplayedWeek } },
    ],
    $and: [{ $or: [{ endDate: { $gte: startOfWeek } }, { endDate: null }] }],
  })
    .select(
      "userId taskName taskStatus startDate endDate taskDescription taskPriority"
    )
    .lean();
}

/**
 * Groups tasks by day and user
 */
function groupTasksByDayAndUser(
  tasks,
  userMap,
  startOfWeek,
  endOfWeek,
  daysOfWeek
) {
  const tasksByDayAndUser = {};

  tasks.forEach((task) => {
    const userId = task.userId?.toString() || "";
    task.assignedUsername = userMap[userId] || "Unbekannt";

    const loopStartDate = new Date(
      Math.max(startOfWeek.getTime(), task.startDate.getTime())
    );
    loopStartDate.setHours(0, 0, 0, 0);

    const taskEndDate = task.endDate ? new Date(task.endDate) : endOfWeek;
    const loopEndDate = new Date(
      Math.min(endOfWeek.getTime(), taskEndDate.getTime())
    );

    let currentDate = new Date(loopStartDate);

    while (currentDate.getTime() <= loopEndDate.getTime()) {
      const dayIndex = (currentDate.getDay() - 1 + 7) % 7;
      const dayName = daysOfWeek[dayIndex];

      if (!tasksByDayAndUser[userId]) {
        tasksByDayAndUser[userId] = {};
      }
      if (!tasksByDayAndUser[userId][dayName]) {
        tasksByDayAndUser[userId][dayName] = [];
      }

      tasksByDayAndUser[userId][dayName].push(task);

      currentDate = addDays(currentDate, 1);
      currentDate.setHours(0, 0, 0, 0);
    }
  });

  return tasksByDayAndUser;
}

module.exports = {
  fetchTasksForWeek,
  groupTasksByDayAndUser,
};
