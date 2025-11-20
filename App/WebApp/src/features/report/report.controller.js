const Report = require("./report.model");
const reportRepository = require("./report.repository");
const { REPORT_TYPES, REPORT_STATUSES } = require("./report.model");
const { renderView, renderErrorView } = require("../../utils/view-renderer");
const { validateReportData } = require("./report.validator");

// GET form for creating a report
async function showCreateForm(req, res) {
  const title = req.__("REPORT_CREATE_TITLE");
  renderView(req, res, "report_user", title, {
    entityToModify: {},
    isEditing: false,
    errors: {},
    types: REPORT_TYPES,
    myReports: [],
  });
}

// GET list of own reports
async function listUserReports(req, res) {
  const title = req.__("REPORT_MY_TITLE");
  try {
    const items = await Report.find({ userId: req.user.id })
      .sort({ startDate: 1 })
      .exec();
    renderView(req, res, "report_user", title, {
      myReports: items.map((i) => i.toObject()),
      entityToModify: {},
      isListing: true,
      isEditing: false,
      types: REPORT_TYPES,
      statuses: REPORT_STATUSES,
      errors: {},
    });
  } catch (err) {
    req.logger.error("Error listing reports", err);
    return renderErrorView(req, res, "REPORT_LIST_ERROR", 500);
  }
}

// POST create report
async function createReport(req, res) {
  const { type, startDate, endDate, description } = req.body;
  const title = req.__("REPORT_CREATE_TITLE") || "Report anlegen";
  try {
    const validationErrors = await validateReportData(req, false);
    if (Object.keys(validationErrors).length > 0) {
      return renderView(req, res, "report_user", title, {
        entityToModify: { type, startDate, endDate, description },
        isEditing: false,
        errors: validationErrors,
        types: REPORT_TYPES,
      });
    }
    const newReport = new Report({
      userId: req.user.id,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description,
      status: "pending",
    });
    await newReport.save();
    res.redirect("/reports/my");
  } catch (err) {
    req.logger.error("Error creating report", err);
    return renderErrorView(req, res, "REPORT_CREATE_ERROR", 500, err.message);
  }
}

// GET admin calendar view
async function showAdminCalendar(req, res) {
  const title = req.__("REPORT_ADMIN_CALENDAR_TITLE") || "Reports Kalender";
  renderView(req, res, "report_admin", title, {
    statuses: REPORT_STATUSES,
    types: REPORT_TYPES,
  });
}

// GET JSON list for calendar (?year=YYYY&month=MM)
async function listAllReportsJSON(req, res) {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10) - 1; // JS Date month index
    if (isNaN(year) || isNaN(month)) {
      return res.status(400).json({ msg: "Ungültige Parameter." });
    }
    const rangeStart = new Date(year, month, 1);
    const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const reports = await reportRepository.findInRange(rangeStart, rangeEnd);
    res.json({
      items: reports.map((r) => ({
        id: r.id,
        user: r.userId && r.userId.username ? r.userId.username : null,
        type: r.type,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        description: r.description || "",
      })),
    });
  } catch (err) {
    req.logger.error("Error fetching reports for calendar", err);
    res.status(500).json({ msg: "Serverfehler beim Laden der Reports." });
  }
}

// POST approve
async function approveReport(req, res) {
  try {
    const item = await Report.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: "Report nicht gefunden." });
    item.status = "approved";
    item.approvedBy = req.user.id;
    item.approvedAt = new Date();
    await item.save();
    res.json({ msg: "Report genehmigt.", status: item.status });
  } catch (err) {
    req.logger.error("Error approving report", err);
    res.status(500).json({ msg: "Serverfehler beim Genehmigen." });
  }
}

// POST reject
async function rejectReport(req, res) {
  try {
    const item = await Report.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: "Report nicht gefunden." });
    item.status = "rejected";
    item.approvedBy = req.user.id;
    item.approvedAt = new Date();
    await item.save();
    res.json({ msg: "Report abgelehnt.", status: item.status });
  } catch (err) {
    req.logger.error("Error rejecting report", err);
    res.status(500).json({ msg: "Serverfehler beim Ablehnen." });
  }
}

module.exports = {
  showCreateForm,
  listUserReports,
  createReport,
  showAdminCalendar,
  listAllReportsJSON,
  approveReport,
  rejectReport,
};
