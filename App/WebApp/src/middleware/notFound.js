// const generateLayout = require("../utils/layout"); // NICHT MEHR BENÖTIGT

/**
 * 404-Middleware (Catch-All-Handler).
 * Diese Funktion wird aufgerufen, wenn keine andere Express-Route
 * für den angeforderten Pfad gefunden wurde.
 * @param {object} req - Express Request Objekt
 * @param {object} res - Express Response Objekt
 * @param {function} next - Nächste Middleware-Funktion (wird hier nicht aufgerufen)
 */
const notFoundHandler = (req, res, next) => {
  // 1. Setzt den HTTP-Statuscode auf 404 (Not Found)
  res.status(404);

  // 2. Rendert das EJS-Template "404". Express sucht dies in views/404.ejs
  // Wir übergeben nur die benötigten spezifischen Daten.
  res.render("404", {
    // Variable für den Seitentitel (wird im layout.ejs verwendet)
    title: req.__("404_NOT_FOUND_TITLE") || "404 - Seite nicht gefunden",
    // Variable, um die angeforderte URL im Template anzuzeigen (views/404.ejs)
    originalUrl: req.originalUrl,
    // Die Styles für die 404-Seite sind jetzt im 404.ejs Template selbst eingebettet.
    // Wir brauchen hier keine separate Style-Variable, da das EJS-Template
    // den Inhalt und die Darstellung direkt liefert.
  });
};

module.exports = { notFoundHandler };
