const mongoose = require("mongoose");

// Define the schema for task templates
const taskTemplateSchema = new mongoose.Schema({
  templateName: {
    type: String,
    required: true,
    trim: true,
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
  taskPriority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  defaultDuration: {
    type: Number, // Duration in days
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

// Add indexes for better query performance
taskTemplateSchema.index({ templateName: 1 });
taskTemplateSchema.index({ createdAt: -1 });

// Create and export the model
module.exports = mongoose.model("TaskTemplate", taskTemplateSchema);
