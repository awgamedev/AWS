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

  res.render("404", {
    title: req.__("404_NOT_FOUND_TITLE"),
    originalUrl: req.originalUrl,
  });
};

module.exports = { notFoundHandler };
