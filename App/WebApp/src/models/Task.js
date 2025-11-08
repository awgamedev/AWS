const mongoose = require("mongoose");

// Define the schema for our simple task
const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  taskName: {
    type: String,
    required: true,
    trim: true,
  },
  taskDescription: {
    type: String,
    required: false,
    trim: true,
  },
  taskStatus: {
    type: String,
    enum: ["pending", "in-progress", "completed"],
    default: "pending",
  },
  taskPriority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String,
    required: true,
    trim: true,
  },
  modifiedAt: {
    type: Date,
    default: Date.now,
  },
  modifiedBy: {
    type: String,
    required: true,
    trim: true,
  },
});

// Create and export the model
module.exports = mongoose.model("task", taskSchema);
