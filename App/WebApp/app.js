/**
 * Express Application Configuration
 * * This file creates and configures the Express application instance.
 */
const express = require("express");
const mongoose = require("mongoose"); // Import Mongoose
const dotenv = require("dotenv"); // 1. Import dotenv
const passport = require("passport"); // 2. Import Passport
const session = require("express-session"); // NEU: Session-Middleware importieren

// Lade Umgebungsvariablen aus der .env-Datei
dotenv.config(); // Führt dotenv aus, um Umgebungsvariablen zu laden

// Importiere Ihre Passport-Konfiguration (muss nach dotenv.config() erfolgen)
require("./config/passport"); // 3. Importiere die Passport-Strategie-Konfiguration (Diese Datei müssen Sie noch erstellen!)

const mainRouter = require("./routes/index"); // Import the main router
const authRouter = require("./routes/auth"); // <-- 1. LOGIN ROUTER IMPORTIEREN

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

// NEU: Session-Konfiguration (MUSS vor passport.session() erfolgen)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "a-strong-default-secret", // Verwenden Sie ein echtes Geheimnis aus der .env
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session()); // NEU: Aktiviert Session-Unterstützung für Passport

// --- Routes ---
// Use the imported router for all paths (e.g., / and /api/status)
app.use("/", authRouter); // <-- 2. LOGIN ROUTER HINZUFÜGEN (behandelt /login)
app.use("/", mainRouter);

// Export the configured app for use in server.js
module.exports = app;
