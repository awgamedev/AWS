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
const { requestTimer } = require("./src/middleware/requestTimer");
const { notFoundHandler } = require("./src/middleware/notFound");
const path = require("path");
const i18n = require("i18n");
const cookieParser = require("cookie-parser");
const favicon = require("serve-favicon");

i18n.configure({
  locales: ["en", "de", "fr"], // supported languages
  directory: __dirname + "/locales", //save translation files here
  defaultLocale: "de",
  cookie: "lang", // Optional: Save language preference in a cookie
  queryParameter: "lang", // Optional: supports setting language via query parameter (e.g., ?lang=en)
  syncFiles: true, // Creates missing translation files
  autoReload: true, // Useful during development to reload translations without restarting the server
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(), // Needed for grafana/loki parsing
  transports: [new winston.transports.Console()],
});

// Logging im Code verwenden
logger.info("Die Anwendung wurde gestartet.");

// Lade Umgebungsvariablen aus der .env-Datei
dotenv.config(); // Führt dotenv aus, um Umgebungsvariablen zu laden

// Importiere Ihre Passport-Konfiguration (muss nach dotenv.config() erfolgen)
require("./src/config/passport"); // 3. Importiere die Passport-Strategie-Konfiguration (Diese Datei müssen Sie noch erstellen!)

const mainRouter = require("./index"); // Import the main router
const authRouter = require("./src/routes/auth"); // <-- 1. LOGIN ROUTER IMPORTIEREN
const langRouter = require("./src/routes/lang"); // Import language routes
const messageRouter = require("./src/routes/message"); // Import message routes
const userRouter = require("./src/routes/user"); // Import user routes

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("💾 MongoDB successfully connected"))
  .catch((err) => console.error("🚨 MongoDB connection error:", err));

// Initialize the Express application
const app = express();

app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

app.use(cookieParser()); // 🍪 Jetzt werden Cookies geparst und in req.cookies gespeichert

// Add i18n initialization middleware
app.use(i18n.init);

app.use((req, res, next) => {
  req.logger = logger;
  next();
});

// 2. Request Timer ausführen (MUSS NACH dem Logger laufen)
app.use(requestTimer); // <-- HIER IST DIE NEUE MIDDLEWARE

app.use(express.static(path.join(__dirname, "public")));

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
app.use("/", mainRouter);
app.use("/", authRouter);
app.use("/", langRouter);
app.use("/", messageRouter);
app.use("/", userRouter);

app.use(notFoundHandler);

// Export the configured app for use in server.js
module.exports = app;
