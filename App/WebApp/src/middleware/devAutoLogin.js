// ./src/middleware/devAutoLogin.js

const User = require("../models/User"); // Pfad zu Ihrem Mongoose User-Modell anpassen!

/**
 * Middleware, die einen bestimmten Benutzer automatisch anmeldet,
 * WENN die Umgebung 'development' ist und der Benutzer noch nicht angemeldet ist.
 */
async function devAutoLogin(req, res, next) {
  // 1. Prüfen der Umgebung und des Anmeldestatus
  if (process.env.NODE_ENV !== "development" || req.isAuthenticated()) {
    // Im Produktiv-Modus oder wenn bereits angemeldet, einfach fortfahren
    return next();
  }

  // 2. Benutzer-ID für das automatische Login (aus .env-Datei)
  const DEV_USER_ID = process.env.DEV_AUTO_LOGIN_USER_ID;

  if (!DEV_USER_ID) {
    console.warn(
      "⚠️ DEV_AUTO_LOGIN_USER_ID nicht in .env gefunden. Kein automatisches Login."
    );
    return next(); // Weiter zur normalen ensureAuthenticated-Prüfung
  }

  try {
    // 3. Benutzer laden
    const user = await User.findById(DEV_USER_ID);

    if (user) {
      // 4. Benutzer über Passport anmelden (simuliert req.login())
      // req.logIn ist die asynchrone Funktion, die Passport verwendet,
      // um den Benutzer in der Session zu speichern.
      req.login(user, (err) => {
        if (err) {
          console.error("🚨 Fehler beim automatischen Login (req.login):", err);
          return next(err);
        }
        console.log(
          `✨ Automatisch als Dev-User (${
            user.email || user.username
          }) angemeldet.`
        );
        return next(); // Fortfahren zur angefragten Route
      });
    } else {
      console.error(
        `🚨 Dev-User mit ID ${DEV_USER_ID} nicht in der Datenbank gefunden.`
      );
      next();
    }
  } catch (e) {
    console.error("🚨 Fehler beim Abrufen des Dev-Users:", e);
    next();
  }
}

module.exports = { devAutoLogin };
