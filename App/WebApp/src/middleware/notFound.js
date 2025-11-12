const { renderView } = require("../utils/view-renderer"); // NEU: Import der View-Renderer Utility

/**
 * 404-Middleware (Catch-All-Handler).
 * Diese Funktion wird aufgerufen, wenn keine andere Express-Route
 * für den angeforderten Pfad gefunden wurde.
 * @param {object} req - Express Request Objekt
 * @param {object} res - Express Response Objekt
 * @param {function} next - Nächste Middleware-Funktion (wird hier nicht aufgerufen)
 */
const notFoundHandler = (req, res, next) => {
  res.status(404);

  renderView(req, res, "404", req.__("404_NOT_FOUND_TITLE"), {
    originalUrl: req.originalUrl,
  });
};

module.exports = { notFoundHandler };
