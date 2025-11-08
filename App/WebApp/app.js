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
const fs = require("fs");
const path = require("path");
const i18n = require("i18n");
const cookieParser = require("cookie-parser");
const favicon = require("serve-favicon");

// --- Router Auto-Discovery Konfiguration ---
const routesDir = path.join(__dirname, "src", "routes");
const routerFiles = []; // Speichert die vollständigen Pfade zu den Router-Dateien

// --- Logger Konfiguration ---
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(), // Needed for grafana/loki parsing
  transports: [new winston.transports.Console()],
});

// Logging im Code verwenden
logger.info("Die Anwendung wurde gestartet.");

// --- i18n Konfiguration ---
i18n.configure({
  locales: ["en", "de", "fr"], // supported languages
  directory: __dirname + "/locales", //save translation files here
  defaultLocale: "de",
  cookie: "lang", // Optional: Save language preference in a cookie
  queryParameter: "lang", // Optional: supports setting language via query parameter (e.g., ?lang=en)
  syncFiles: true, // Creates missing translation files
  autoReload: true, // Useful during development to reload translations without restarting the server
});

// Lade Umgebungsvariablen aus der .env-Datei (MUSS ALS EINES DER ERSTEN PASSIEREN)
dotenv.config(); // Führt dotenv aus, um Umgebungsvariablen zu laden

// Importiere Ihre Passport-Konfiguration (muss nach dotenv.config() erfolgen)
require("./src/config/passport"); // 3. Importiere die Passport-Strategie-Konfiguration

// --- Dynamisches Router-Laden Logik (Nach dotenv!) ---

/**
 * Durchsucht ein Verzeichnis rekursiv nach .js-Dateien (Routern)
 * @param {string} directory - Das aktuelle Verzeichnis, das durchsucht wird
 */
function findRouterFiles(directory) {
  try {
    const files = fs.readdirSync(directory);

    files.forEach((file) => {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Wenn es ein Ordner ist, rufe die Funktion rekursiv auf
        findRouterFiles(fullPath);
      } else if (file.endsWith(".js") && file !== "index.js") {
        // Wenn es eine .js-Datei (und nicht 'index.js') ist, füge sie hinzu
        routerFiles.push(fullPath);
      }
    });
  } catch (error) {
    // Dies fängt Fehler ab, falls das Verzeichnis nicht existiert oder nicht lesbar ist
    if (error.code !== "ENOENT") {
      logger.error(
        `🚨 Fehler beim Lesen des Routen-Verzeichnisses ${directory}:`,
        error.message
      );
    }
  }
}

findRouterFiles(routesDir);

if (routerFiles.length > 0) {
  logger.info(
    `✅ Gefundene ${routerFiles.length} Router-Dateien (inkl. Unterordner) für dynamisches Laden.`
  );
} else {
  logger.warn("⚠️ Keine Router-Dateien in src/routes gefunden.");
}

// --- Manuelle Imports (Für Router, die nicht im dynamischen Pfad sind oder speziell behandelt werden) ---
const mainRouter = require("./index"); // Import the main router
// 'auth' und 'lang' werden oft manuell importiert, um die Reihenfolge zu sichern.
const authRouter = require("./src/routes/auth");
const langRouter = require("./src/routes/lang");

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
// 1. Manuell importierte Router
app.use("/", mainRouter);
app.use("/", authRouter);
app.use("/", langRouter);

// 2. Dynamisch geladene Router (inkl. Unterordner)
routerFiles.forEach((file) => {
  try {
    const router = require(file);
    // Da Sie ursprünglich alle auf "/" gemountet hatten, behalten wir das bei.
    app.use("/", router);

    const relativePath = path.relative(routesDir, file);
    logger.info(`   - Mounted dynamically: /${relativePath}`);
  } catch {}
});

app.use(notFoundHandler);

// Export the configured app for use in server.js
module.exports = app;
