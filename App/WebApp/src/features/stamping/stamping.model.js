const mongoose = require("mongoose");

// Define the schema for our simple stamping
const { ALLOWED_STAMPING_REASONS } = require("./stamping.constants");

const stampingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  stampingType: {
    type: String,
    enum: ["in", "out"],
    required: true,
  },
  stampingReason: {
    type: String,
    enum: ALLOWED_STAMPING_REASONS,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Create and export the model
module.exports = mongoose.model("Stamping", stampingSchema);
