// Express Application Configuration
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const passport = require("passport");
const session = require("express-session");
const winston = require("winston");
const { requestTimer } = require("./src/middleware/requestTimer");
const { notFoundHandler } = require("./src/middleware/notFound");
const { mtlsAutoLogin } = require("./src/middleware/mtlsAutoLogin");
const fs = require("fs");
const path = require("path");
const i18n = require("i18n");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const userProfileRepository = require("./src/features/user-profile/user-profile.repository");

// Router auto-discovery configuration
const featuresDir = path.join(__dirname, "src", "features");
const ROUTE_SUFFIX = ".routes.js";
const {
  findFilesWithSuffix,
  findViewDirectories,
} = require("./src/utils/file-utils");
let routerFiles = [];
let viewDirectories = [];

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(), // Needed for grafana/loki parsing
  transports: [new winston.transports.Console()],
});

logger.info("Application started.");

i18n.configure({
  locales: ["en", "de", "fr"],
  directory: __dirname + "/locales",
  defaultLocale: "de",
  cookie: "lang",
  queryParameter: "lang",
  syncFiles: true,
  autoReload: true,
});

// Load environment variables from .env file
dotenv.config();

// Import Passport configuration (must be after dotenv.config())
require("./src/config/passport");

// Discover routers and view directories
routerFiles = findFilesWithSuffix(featuresDir, ROUTE_SUFFIX);
if (routerFiles.length > 0) {
  logger.info(
    `Found ${routerFiles.length} feature router files (${ROUTE_SUFFIX}) for dynamic loading.`
  );
} else {
  logger.warn(`No router files found in ${featuresDir}.`);
}

viewDirectories = findViewDirectories(featuresDir);

// Add global views directory (e.g., src/views for layouts) if it exists
const globalViewsDir = path.join(__dirname, "src", "views");
if (
  fs.existsSync(globalViewsDir) &&
  fs.statSync(globalViewsDir).isDirectory()
) {
  viewDirectories.push(globalViewsDir);
  // Add 'partials' subdirectory for EJS aliasing if it exists
  const partialsDir = path.join(globalViewsDir, "partials");
  if (fs.existsSync(partialsDir) && fs.statSync(partialsDir).isDirectory()) {
    viewDirectories.push(partialsDir);
    logger.info(
      `'src/views/partials' added as direct EJS search path (alias).`
    );
  }
}

if (viewDirectories.length > 0) {
  logger.info(
    `Found ${viewDirectories.length} view directories for EJS templates.`
  );
} else {
  logger.warn(`No 'views' folders found in ${featuresDir}.`);
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("💾 MongoDB successfully connected"))
  .catch((err) => console.error("🚨 MongoDB connection error:", err));

// Initialize Express application
const app = express();

app.use(flash());

// Set EJS view engine with all discovered view directories
app.set("view engine", "ejs");
app.set("views", viewDirectories);

app.locals.rmWhitespace = true;

app.use(cookieParser());

app.use(i18n.init);

// Attach logger to request
app.use((req, res, next) => {
  req.logger = logger;
  next();
});

// Request timer middleware (must run after logger)
app.use(requestTimer);

app.use(express.static(path.join(__dirname, "public")));

// Parse URL-encoded form data and JSON payloads
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));

// Session configuration (must be before passport.session())
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "a-strong-default-secret",
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
// Export session middleware for Socket.IO
app.set("sessionMiddleware", sessionMiddleware);

// mTLS auto-login before dev auto-login so production prefers certificate auth
app.use(mtlsAutoLogin);
// app.use(devAutoLogin);

// Middleware to provide global variables for all EJS templates (res.locals)
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.title = res.locals.title || "Application Dashboard";
  res.locals.userName = req.user ? req.user.username : "Guest";
  res.locals.userInitials = res.locals.userName.substring(0, 2).toUpperCase();
  res.locals.isLoggedIn = !!req.user;
  res.locals.user = req.user || null;
  res.locals.userRole = req.user ? req.user.role : null;
  res.locals.userProfile = res.locals.userProfile || null;
  res.locals.styles = res.locals.styles || "";
  next();
});
// If logged in, load user profile and provide it to layout
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

// Dynamically load routers (including subfolders)
routerFiles.forEach((file) => {
  try {
    const router = require(file);
    app.use("/", router);
    const relativePath = path.relative(featuresDir, file);
    logger.info(`Mounted dynamically: /${relativePath}`);
  } catch (ex) {
    logger.error(`Could not mount route for file ${file}: `, ex);
  }
});

app.use(notFoundHandler);

// Export the configured app for use in server.js
module.exports = app;
