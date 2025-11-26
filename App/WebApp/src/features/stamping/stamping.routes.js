const express = require("express");
const router = express.Router();
const Stamping = require("./stamping.model");
const { ensureAuthenticated } = require("../../middleware/auth");
const { renderView } = require("../../utils/view-renderer");
const { formatTime, formatDate } = require("../../utils/date-utils");
const { getStampingPairs } = require("./utils/stamping-pair-utils");
const {
  validateStampingData,
  validateLatestChronological,
} = require("./stamping.validator");

// Centralized allowed reasons
const { ALLOWED_STAMPING_REASONS } = require("./stamping.constants");

/**
 * Home redirect – keep root path lean and forward to the dashboard.
 * This keeps bookmark/backwards compatibility while making `/dashboard` canonical.
 */
router.get("/", (req, res) => {
  return res.redirect("/time-tracking/stamping");
});

// ⏳ GET Route: Stempel-Interface anzeigen (/stamping)
router.get("/time-tracking/stamping", ensureAuthenticated, async (req, res) => {
  const title = req.__("STAMPING_PAGE_TITLE");
  let currentStatus = "out";
  let lastStampingTime = "N/A";
  let stampingPairs = [];
  let canStampInToday = true;
  let canStampOutToday = false;

  try {
    const userId = req.user.id;
    const now = new Date();
    const todayKey = formatDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate())
    );

    // 1. Letzten Stempel-Eintrag abrufen
    const lastStamping = await Stamping.findOne({ userId })
      .sort({ date: -1 })
      .exec();
    if (lastStamping) {
      currentStatus = lastStamping.stampingType;
      lastStampingTime = formatTime(lastStamping.date);
    }

    // 2. Get current month's start and end dates
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // 3. Fetch stampings only for current month
    const stampings = await Stamping.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .sort({ date: 1 })
      .exec();

    const allPairs = await getStampingPairs(stampings);

    // 4. Create a map of dates to stamping pairs
    const pairsByDate = new Map();
    allPairs.forEach((pair) => {
      const dateKey = formatDate(pair.come.date);
      if (!pairsByDate.has(dateKey)) {
        pairsByDate.set(dateKey, []);
      }
      pairsByDate.get(dateKey).push(pair);
    });

    // 5. Generate all days from start of month to today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysList = [];
    const dayNames = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];

    for (
      let d = new Date(startOfMonth);
      d <= today;
      d.setDate(d.getDate() + 1)
    ) {
      const currentDate = new Date(d);
      const dateKey = formatDate(currentDate);
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = dateKey === todayKey;

      daysList.push({
        date: currentDate,
        dateStr: dateKey,
        dayName: dayNames[dayOfWeek],
        isWeekend: isWeekend,
        isToday: isToday,
        pairs: pairsByDate.get(dateKey) || [],
      });
    }

    // Reverse to show most recent first
    stampingPairs = daysList.reverse();

    // --- Button logic ---
    // Find last 'in' stamping
    const lastInStamping = await Stamping.findOne({
      userId,
      stampingType: "in",
    })
      .sort({ date: -1 })
      .exec();
    let lastInIsToday = false;
    if (lastInStamping) {
      const lastInDate = lastInStamping.date;
      const nowY = now.getFullYear(),
        nowM = now.getMonth(),
        nowD = now.getDate();
      const inY = lastInDate.getFullYear(),
        inM = lastInDate.getMonth(),
        inD = lastInDate.getDate();
      lastInIsToday = nowY === inY && nowM === inM && nowD === inD;
    }
    // Find the last stamping (any type)
    // Only allow 'out' if last 'in' is from today and is the last stamping
    if (
      lastInStamping &&
      lastInIsToday &&
      lastStamping &&
      lastStamping.stampingType === "in" &&
      String(lastStamping._id) === String(lastInStamping._id)
    ) {
      canStampOutToday = true;
      canStampInToday = false;
    } else {
      canStampOutToday = false;
      canStampInToday = true;
    }
  } catch (error) {
    console.error("Fehler beim Abrufen der Stempeldaten:", error.message);
    return renderView(
      req,
      res,
      "error_message",
      req.__ ? req.__("ERROR_TITLE") : "Fehler",
      {
        message: req.__
          ? req.__("STAMPING_LOAD_ERROR")
          : "Fehler beim Laden der Zeiterfassungsdaten.",
      },
      "",
      500
    );
  }

  renderView(req, res, "stamping_user", title, {
    currentStatus: currentStatus,
    lastStampingTime: lastStampingTime,
    stampingPairs: stampingPairs,
    allowedReasons: ALLOWED_STAMPING_REASONS,
    formatDate: formatDate,
    formatTime: formatTime,
    canStampInToday,
    canStampOutToday,
  });
});

// A route for an employee to stamp in or out (/stamp) - remains an API route
router.post("/stamp", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { stampingType, stampingReason } = req.body;

    const validationErrors = await validateStampingData(
      req,
      ALLOWED_STAMPING_REASONS
    );
    if (Object.keys(validationErrors).length > 0) {
      return res
        .status(400)
        .json({ msg: "Ungültige Stempeldaten.", errors: validationErrors });
    }

    // Current timestamp for this stamping
    const nowDate = new Date();

    // Find the last 'in' stamping for this user
    const lastInStamping = await Stamping.findOne({
      userId,
      stampingType: "in",
    })
      .sort({ date: -1 })
      .exec();
    let lastInIsToday = false;
    if (lastInStamping) {
      const lastInDate = lastInStamping.date;
      const nowY = nowDate.getFullYear(),
        nowM = nowDate.getMonth(),
        nowD = nowDate.getDate();
      const inY = lastInDate.getFullYear(),
        inM = lastInDate.getMonth(),
        inD = lastInDate.getDate();
      lastInIsToday = nowY === inY && nowM === inM && nowD === inD;
    }

    // Find the last stamping (any type)
    const lastStamping = await Stamping.findOne({ userId })
      .sort({ date: -1 })
      .exec();

    // Only allow 'out' if last 'in' is from today and is the last stamping
    if (stampingType === "out") {
      if (
        !lastInStamping ||
        !lastInIsToday ||
        !lastStamping ||
        lastStamping.stampingType !== "in" ||
        String(lastStamping._id) !== String(lastInStamping._id)
      ) {
        return res.status(400).json({
          msg: "Du kannst nur heute ausstempeln, wenn du heute eingestempelt hast.",
          errors: {
            stampingSequence:
              "Ausgestempelt werden ist nur am selben Tag wie das Einstempeln erlaubt.",
          },
        });
      }
    }

    // Allow 'in' if last 'in' is not today, even if last 'out' is missing
    if (stampingType === "in") {
      if (
        lastInStamping &&
        lastInIsToday &&
        lastStamping &&
        lastStamping.stampingType === "in" &&
        String(lastStamping._id) === String(lastInStamping._id)
      ) {
        return res.status(400).json({
          msg: "Du bist heute bereits eingestempelt.",
          errors: { stampingSequence: "Du bist heute bereits eingestempelt." },
        });
      }
    }

    // Chronology validation: ensure there is no later stamping today
    const chronologyErrors = await validateLatestChronological(
      req,
      userId,
      nowDate
    );
    const allErrors = { ...validationErrors, ...chronologyErrors };
    if (Object.keys(allErrors).length > 0) {
      return res
        .status(400)
        .json({ msg: "Ungültige Stempeldaten.", errors: allErrors });
    }

    const newStamping = new Stamping({
      userId,
      stampingType,
      stampingReason: stampingType === "in" ? stampingReason : undefined,
      date: nowDate,
    });

    const stampingEntry = await newStamping.save();

    res.status(201).json({
      msg: `Erfolgreich ${
        stampingType === "in" ? "eingestempelt" : "ausgestempelt"
      } ${
        stampingType === "in" ? `(Grund: ${stampingEntry.stampingReason})` : ""
      } um ${stampingEntry.date.toLocaleTimeString("de-DE")}.`,
      stamping: stampingEntry.toObject(),
    });
  } catch (err) {
    console.error("Fehler beim Stempelvorgang:", err.message);
    res
      .status(500)
      .json({ msg: "Serverfehler beim Verarbeiten des Stempelvorgangs." });
  }
});

// A route to get the current stamping status (/status) - remains an API route
router.get("/status", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const lastStamping = await Stamping.findOne({ userId })
      .sort({ date: -1 })
      .exec();

    const status = lastStamping ? lastStamping.stampingType : "out";
    const lastTime = lastStamping ? lastStamping.date : null;

    res.json({
      userId,
      currentStatus: status,
      lastStampingTime: lastTime,
      msg: `Der aktuelle Status ist: ${
        status === "in" ? "Eingestempelt" : "Ausgestempelt"
      }.`,
    });
  } catch (err) {
    console.error("Error fetching stamping status:", err.message);
    res.status(500).json({ msg: "Server error while fetching status." });
  }
});

// Provide allowed reasons to client
router.get("/stamp/reasons", ensureAuthenticated, (req, res) => {
  res.json({ reasons: ALLOWED_STAMPING_REASONS });
});

module.exports = router;
