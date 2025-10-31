/**
 * Express Application Configuration
 * * This file creates and configures the Express application instance.
 */
const express = require("express");
const mongoose = require("mongoose"); // Import Mongoose
const mainRouter = require("./routes/index"); // Import the main router

// --- MongoDB Connection ---
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/my-app-db";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("💾 MongoDB successfully connected"))
  .catch((err) => console.error("🚨 MongoDB connection error:", err));

// Initialize the Express application
const app = express();

// --- Middleware and Configuration ---
// Add middleware to parse URL-encoded form data (needed for HTML forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // To handle JSON payloads

// --- Routes ---
// Use the imported router for all paths (e.g., / and /api/status)
app.use("/", mainRouter);

// Export the configured app for use in server.js
module.exports = app;
