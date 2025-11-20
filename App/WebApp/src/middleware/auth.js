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

  const redirectUrl = encodeURIComponent(req.originalUrl);
  return res.redirect(`/login?redirect=${redirectUrl}`);
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

/**
 * Hilfsfunktion zur Überprüfung, ob ein Benutzer eine bestimmte Rolle hat
 * @param {object} user - Das Benutzerobjekt (aus req.user)
 * @param {string|array} requiredRoles - Die benötigte(n) Rolle(n) (z.B. 'admin' oder ['admin', 'moderator'])
 * @returns {boolean} - True, wenn der Benutzer die Rolle hat
 */
const hasRole = (user, requiredRoles) => {
  if (!user || !user.role) {
    return false;
  }

  // Wenn keine Rolle erforderlich ist, gib true zurück
  if (!requiredRoles) {
    return true;
  }

  // Unterstützt sowohl einzelne Rollen als auch Arrays von Rollen
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(user.role);
};

module.exports = { ensureAuthenticated, checkRole, hasRole }; // Export, wenn in separater Datei
