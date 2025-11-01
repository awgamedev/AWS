/**
 * Middleware zur Überprüfung der Authentifizierung
 * @param {object} req - Express Request Objekt
 * @param {object} res - Express Response Objekt
 * @param {function} next - Nächste Middleware-Funktion
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.redirect("/login");
};

/**
 * Middleware zur Überprüfung der Benutzerrolle (Autorisierung)
 * @param {string} requiredRole - Die benötigte Rolle (z.B. 'admin')
 */
const checkRole = (requiredRole) => (req, res, next) => {
  // Stellen Sie sicher, dass der Benutzer authentifiziert ist (req.user existiert)
  if (!req.user) {
    // Falls nicht authentifiziert (sollte *nach* ensureAuthenticated laufen)
    return res.status(401).send("Bitte melden Sie sich an.");
  }

  // Prüfen, ob die Benutzerrolle der benötigten Rolle entspricht
  if (req.user.role === requiredRole) {
    return next();
  }

  // Rolle stimmt nicht überein
  res.status(403).send("🚫 Keine Berechtigung für diese Aktion.");
};

module.exports = { ensureAuthenticated, checkRole }; // Export, wenn in separater Datei
