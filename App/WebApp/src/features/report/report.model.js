const mongoose = require("mongoose");

// Report types and statuses kept inline for now; could be moved to constants file if expanded
const REPORT_TYPES = ["vacation", "illness"];
const REPORT_STATUSES = ["pending", "approved", "rejected"];

const ReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: REPORT_TYPES,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: "pending",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
module.exports.REPORT_TYPES = REPORT_TYPES;
module.exports.REPORT_STATUSES = REPORT_STATUSES;
