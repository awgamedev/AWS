const express = require("express");
const router = express.Router();

// --- Route: Home Page (GET /) ---
router.get("/", (req, res, next) => {
  // Daten, die für das Template (views/index.ejs) benötigt werden
  const itemCount = 5;
  const title = req.__("APP_DASHBOARD_TITLE"); // Titel für die Seite

  // 1. Zuerst den Inhalt der inneren View (index.ejs) als String rendern.
  // Wir müssen die benötigten lokalen Variablen explizit übergeben.
  const innerViewLocals = {
    itemCount: itemCount,
    // i18n-Funktionen
    __: req.__,
    // currentPath (wird in index.ejs verwendet)
    currentPath: res.locals.currentPath, // Aus der Middleware in app.js
  };

  // Express's render engine verwenden, um 'index' zu einem String zu rendern
  req.app.render("index", innerViewLocals, (err, contentHtml) => {
    if (err) {
      req.logger.error("Error rendering index view:", err);
      return next(err);
    }

    // 2. Jetzt das Hauptlayout (layout.ejs) rendern und den Inhalt als bodyContent übergeben
    res.render("layout", {
      title: title,
      bodyContent: contentHtml, // Der gerenderte Inhalt der index.ejs
      // Alle anderen Variablen (userName, isLoggedIn, currentPath für das Menü, etc.)
      // sind bereits über res.locals (in app.js gesetzt) verfügbar.
    });
  });
});

// --- A simple API route (GET /api/status) ---
// API routes do not need the HTML layout
router.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    message: "The server is healthy and responding.",
    timestamp: new Date().toISOString(),
  });
});

// Export the router
module.exports = router;
