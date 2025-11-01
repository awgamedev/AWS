/**
 * Middleware zur Überprüfung der Authentifizierung
 * @param {object} req - Express Request Objekt
 * @param {object} res - Express Response Objekt
 * @param {function} next - Nächste Middleware-Funktion
 */
const ensureAuthenticated = (req, res, next) => {
  // Annahme: Wenn Sie eine Session oder JWT-Strategie verwenden, speichert Passport
  // den Benutzer unter req.user (oder req.isAuthenticated() ist verfügbar bei Sessions)

  // *** Wichtig: Passen Sie dies an Ihre konkrete Passport-Strategie an! ***
  // Wenn Sie JWT (wie mit passport-jwt) verwenden, wird req.user gesetzt, falls das Token gültig ist.
  if (req.user) {
    // Benutzer ist authentifiziert
    return next();
  }

  // Benutzer ist nicht authentifiziert
  const content = `
        <h2>🔒 Zugriff verweigert</h2>
        <p>Sie müssen angemeldet sein, um auf diese Seite zuzugreifen.</p>
        <p><a href="/">Zur Startseite</a></p> 
    `;

  // Sie müssten generateLayout hier importieren oder den Pfad anpassen
  // oder für API-Routen einen JSON-Fehler zurückgeben.

  // Für dieses Beispiel gehen wir davon aus, dass generateLayout zugänglich ist
  // oder Sie implementieren dies als Teil Ihrer allgemeinen Fehlerbehandlung.
  // **WICHTIGER HINWEIS:** Im Kontext Ihrer aktuellen App müssten Sie `generateLayout`
  // in diese Datei importieren, um es hier zu verwenden.

  // Angenommen, Sie implementieren es schnell in routes/index.js,
  // dann können Sie generateLayout direkt verwenden.

  // Oder, für ein universelles Verhalten:
  res.status(401).send("Zugriff verweigert. Bitte melden Sie sich an.");
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
