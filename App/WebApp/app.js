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
const { devAutoLogin } = require("./src/middleware/devAutoLogin"); // Development auto-login
const { mtlsAutoLogin } = require("./src/middleware/mtlsAutoLogin"); // mTLS auto-login
const fs = require("fs");
const path = require("path");
const i18n = require("i18n");
const cookieParser = require("cookie-parser");
const favicon = require("serve-favicon");
const flash = require("connect-flash");
const userProfileRepository = require("./src/features/user-profile/user-profile.repository");

// --- Router Auto-Discovery Konfiguration ---
const featuresDir = path.join(__dirname, "src", "features"); // Suchpfad ist src/features
const routerFiles = []; // Speichert die vollständigen Pfade zu den Router-Dateien
const ROUTE_SUFFIX = ".routes.js"; // Dateiendung, nach der gesucht wird
const viewDirectories = []; // NEU: Speichert die Pfade zu den 'views'-Ordnern

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

/**
 * Durchsucht ein Verzeichnis rekursiv nach Dateien, die auf '.routes.js' enden.
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
      } else if (file.endsWith(ROUTE_SUFFIX)) {
        // Wenn es eine Datei ist, die mit '.routes.js' endet, füge sie hinzu
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

/**
 * Durchsucht ein Verzeichnis rekursiv nach 'views'-Unterordnern für EJS-Templates.
 * @param {string} directory - Das aktuelle Verzeichnis, das durchsucht wird
 */
function findViewDirectories(directory) {
  try {
    const files = fs.readdirSync(directory);

    files.forEach((file) => {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (file === "views") {
          // Wenn der Ordner "views" heißt, füge ihn zur Liste hinzu
          viewDirectories.push(fullPath);
          return; // Nicht tiefer in den views-Ordner suchen
        }
        // Ansonsten, rufe die Funktion rekursiv auf
        findViewDirectories(fullPath);
      }
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      logger.error(
        `🚨 Fehler beim Lesen des View-Verzeichnisses ${directory}:`,
        error.message
      );
    }
  }
}

// --- Starte das Suchen in src/features ---

// 1. Suche nach Routern
findRouterFiles(featuresDir);

if (routerFiles.length > 0) {
  logger.info(
    `✅ Gefundene ${routerFiles.length} Feature-Router-Dateien (${ROUTE_SUFFIX}) für dynamisches Laden.`
  );
} else {
  logger.warn(`⚠️ Keine Router-Dateien in ${featuresDir} gefunden.`);
}

// 2. Suche nach View-Verzeichnissen
findViewDirectories(featuresDir);

// Fügen Sie den globalen Views-Ordner hinzu, falls er existiert (z.B. src/views für Layouts)
const globalViewsDir = path.join(__dirname, "src", "views");
if (
  fs.existsSync(globalViewsDir) &&
  fs.statSync(globalViewsDir).isDirectory()
) {
  // 1. Fügen Sie src/views hinzu (für globale Layouts)
  viewDirectories.push(globalViewsDir);

  // 2. NEU: Fügen Sie den 'partials'-Unterordner hinzu, um kurze Aliase zu ermöglichen
  const partialsDir = path.join(globalViewsDir, "partials");
  if (fs.existsSync(partialsDir) && fs.statSync(partialsDir).isDirectory()) {
    viewDirectories.push(partialsDir);
    logger.info(
      `✅ 'src/views/partials' als direkter EJS-Suchpfad hinzugefügt (Alias).`
    );
  }
}

if (viewDirectories.length > 0) {
  logger.info(
    `✅ Gefundene ${viewDirectories.length} View-Verzeichnisse für EJS-Templates.`
  );
} else {
  logger.warn(`⚠️ Keine 'views'-Ordner in ${featuresDir} gefunden.`);
}

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("💾 MongoDB successfully connected"))
  .catch((err) => console.error("🚨 MongoDB connection error:", err));

// Initialize the Express application
const app = express();

app.use(flash());

// --- NEU: EJS View Engine Konfiguration (Jetzt mit dynamischen Pfaden) ---
// Setzt die Views auf alle rekursiv gefundenen 'views'-Ordner (z.B. ['src/features/user/views', 'src/views', 'src/views/partials'])
app.set("view engine", "ejs");
app.set("views", viewDirectories); // WICHTIG: Übergibt das Array an Express

app.locals.rmWhitespace = true;

// app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

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
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" })); // To handle JSON payloads (increased for image uploads)

// NEU: Session-Konfiguration (MUSS vor passport.session() erfolgen)
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "a-strong-default-secret", // Verwenden Sie ein echtes Geheimnis aus der .env
  resave: false,
  saveUninitialized: false,
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session()); // NEU: Aktiviert Session-Unterstützung für Passport

// Export session middleware for Socket.IO
app.set("sessionMiddleware", sessionMiddleware);

// --- NEUE MIDDLEWARE FÜR EJS GLOBALE VARIABLEN ---
// Diese Middleware macht allgemeine Variablen für alle EJS-Templates verfügbar (res.locals)
app.use((req, res, next) => {
  // Stellt den aktuellen Pfad für das Menü-Highlighting bereit (wird im menu.ejs benötigt)
  res.locals.currentPath = req.path;

  // Stellt allgemeine Layout-Variablen bereit, falls sie nicht von der Route überschrieben werden
  res.locals.title = res.locals.title || "Applikations-Dashboard";
  res.locals.userName = req.user ? req.user.username : "Gast";
  res.locals.userInitials = res.locals.userName.substring(0, 2).toUpperCase();
  res.locals.isLoggedIn = !!req.user;
  res.locals.user = req.user || null; // Macht das vollständige User-Objekt verfügbar
  res.locals.userRole = req.user ? req.user.role : null; // Macht die Benutzerrolle verfügbar
  res.locals.userProfile = res.locals.userProfile || null; // Initialisiert userProfile, damit es immer definiert ist
  res.locals.styles = res.locals.styles || ""; // Stellt sicher, dass 'styles' immer definiert ist

  next();
});
// Lädt (falls eingeloggt) das UserProfile und stellt es im Layout bereit
app.use(async (req, res, next) => {
  if (!req.user) {
    return next();
  }
  try {
    const userProfile = await userProfileRepository.findByUserId(req.user.id);
    res.locals.userProfile = userProfile || null;
    res.locals.userProfilePictureBase64 =
      userProfile?.profilePictureBase64 || null;
  } catch (e) {
    if (req.logger) {
      req.logger.error("Error loading user profile for layout:", e);
    }
  } finally {
    next();
  }
});
// ---------------------------------------------------

// mTLS auto-login BEFORE dev auto-login so production prefers certificate auth
app.use(mtlsAutoLogin);
// app.use(devAutoLogin);

// 2. Dynamisch geladene Router (inkl. Unterordner)
routerFiles.forEach((file) => {
  try {
    const router = require(file);
    // Da Sie ursprünglich alle auf "/" gemountet hatten, behalten wir das bei.
    app.use("/", router);

    const relativePath = path.relative(featuresDir, file);
    logger.info(`    - Mounted dynamically: /${relativePath}`);
  } catch (ex) {
    logger.error(`🚨 Could not mount route for file ${file}: `, ex);
  }
});

app.use(notFoundHandler);

// Export the configured app for use in server.js
module.exports = app;
