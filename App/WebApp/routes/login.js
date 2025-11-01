/**
 * Express Router für Login- und Authentifizierungs-Routen
 */
const express = require("express");
const router = express.Router();
const passport = require("passport"); // Wichtig: Passport importieren
const generateLayout = require("../utils/layout"); // Layout-Funktion importieren

// --- Route: Login-Formular anzeigen (GET /login) ---
router.get("/login", (req, res) => {
  // Falls Sie Fehler oder Nachrichten über Sessions speichern, können Sie diese hier anzeigen
  const message = req.query.error
    ? '<p style="color: red; font-weight: bold;">Falscher Benutzername oder Passwort.</p>'
    : "";

  const content = `
        <h2>Anmelden</h2>
        ${message}
        <form action="/login" method="POST">
            <label for="email" style="display: block; margin-top: 15px; font-weight: bold;">E-Mail:</label>
            <input type="email" id="email" name="email" required 
                   style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            
            <label for="password" style="display: block; margin-top: 15px; font-weight: bold;">Passwort:</label>
            <input type="password" id="password" name="password" required 
                   style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            
            <button type="submit" 
                    style="background-color: #00796b; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px; font-size: 1em;">
                Login
            </button>
        </form>
        <div style="margin-top: 20px; display: block; text-align: center;"><a href="/">Zur Startseite</a></div>
    `;

  res.send(generateLayout("Login", content));
});

// --- Route: Login-Anmeldedaten verarbeiten (POST /login) ---
router.post(
  "/login",
  // Passport die Anmeldedaten verarbeiten lassen (nutzt die 'local' Strategie)
  passport.authenticate("local", {
    // Hier müsste die JWT-Erzeugung (Token-Erstellung) oder eine Session-Logik folgen.
    // Vorerst leiten wir bei Erfolg zur Startseite und bei Fehler zurück zum Login weiter.
    successRedirect: "/",
    failureRedirect: "/login?error=true",
  })
  // ACHTUNG: Für eine komplette JWT-Implementierung müssten Sie hier eine
  // manuelle Authentifizierung verwenden, um das Token zu erstellen und zu senden.
);

// Export the router
module.exports = router;
