/**
 * Express Application Configuration
 * * This file creates and configures the Express application instance.
 */
const express = require("express");
const mongoose = require("mongoose"); // Import Mongoose
const dotenv = require("dotenv"); // 1. Import dotenv
const passport = require("passport"); // 2. Import Passport
const session = require("express-session"); // NEU: Session-Middleware importieren
const winston = require("winston");

// Grundkonfiguration des Loggers
const logger = winston.createLogger({
  level: "info", // Standard-Log-Level
  format: winston.format.json(), // Strukturierte Logs
  transports: [
    // Logs an die Konsole senden
    new winston.transports.Console({
      format: winston.format.simple(), // Einfaches Format für die Konsole
    }),
    // Logs in eine Datei schreiben
    new winston.transports.File({ filename: "app.log" }),
  ],
});

// Logging im Code verwenden
logger.info("Die Anwendung wurde gestartet.");
logger.warn("Achtung: Ein optionaler Parameter fehlt.");
logger.error("Fehler beim Zugriff auf die Datenbank!", {
  error: new Error("DB Connection failed"),
});

// Lade Umgebungsvariablen aus der .env-Datei
dotenv.config(); // Führt dotenv aus, um Umgebungsvariablen zu laden

// Importiere Ihre Passport-Konfiguration (muss nach dotenv.config() erfolgen)
require("./config/passport"); // 3. Importiere die Passport-Strategie-Konfiguration (Diese Datei müssen Sie noch erstellen!)

const mainRouter = require("./routes/index"); // Import the main router
const authRouter = require("./routes/auth"); // <-- 1. LOGIN ROUTER IMPORTIEREN

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;

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
