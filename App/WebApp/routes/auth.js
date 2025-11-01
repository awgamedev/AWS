/**
 * Express Router für Authentifizierungs-Routen (Login, Register)
 */
const express = require("express");
const router = express.Router();
const passport = require("passport");
const generateLayout = require("../utils/layout");
const User = require("../models/User"); // Wichtig: User Model importieren
const bcrypt = require("bcryptjs"); // Wichtig: Für Passwort-Hashing

// --- Funktion zum Hinzufügen von Links und Styling ---
const getAuthLinks = () => `
    <div style="margin-top: 20px; display: flex; justify-content: space-between; font-size: 0.9em;">
        <a href="/">← Zur Startseite</a>
        <a href="/register">Noch kein Konto? Registrieren →</a>
    </div>
`;
const getRegisterLinks = () => `
    <div style="margin-top: 20px; display: flex; justify-content: space-between; font-size: 0.9em;">
        <a href="/">← Zur Startseite</a>
        <a href="/login">Bereits registriert? Login →</a>
    </div>
`;

// ------------------------------------------------------------------
// --- Login-Seite (Überarbeitet mit Link zur Registrierung) (GET /login) ---
router.get("/login", (req, res) => {
  // Falls Sie Fehler oder Nachrichten über Sessions speichern, können Sie diese hier anzeigen
  const message = req.query.error
    ? '<p style="color: red; font-weight: bold;">Falsche E-Mail oder Passwort.</p>'
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
        ${getAuthLinks()}
    `;

  res.send(generateLayout("Login", content));
});

// --- Login-Daten verarbeiten (POST /login) ---
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login?error=true",
  })
);

// ------------------------------------------------------------------
// --- Registrierungs-Formular (GET /register) ---
router.get("/register", (req, res) => {
  const content = `
        <h2>Neues Konto erstellen</h2>
        <form action="/register" method="POST">
            <label for="username" style="display: block; margin-top: 15px; font-weight: bold;">Benutzername:</label>
            <input type="text" id="username" name="username" required 
                   style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            
            <label for="email" style="display: block; margin-top: 15px; font-weight: bold;">E-Mail:</label>
            <input type="email" id="email" name="email" required 
                   style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            
            <label for="password" style="display: block; margin-top: 15px; font-weight: bold;">Passwort:</label>
            <input type="password" id="password" name="password" required 
                   style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            
            <button type="submit" 
                    style="background-color: #f57c00; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px; font-size: 1em;">
                Registrieren
            </button>
        </form>
        ${getRegisterLinks()}
    `;
  res.send(generateLayout("Registrierung", content));
});

// --- Registrierungs-Daten verarbeiten (POST /register) ---
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .send(
        generateLayout(
          "Error",
          "<h2>Error</h2><p>Alle Felder sind erforderlich.</p><p><a href='/register'>Zurück zur Registrierung</a></p>"
        )
      );
  }

  try {
    // 1. Prüfen, ob der Benutzer oder die E-Mail bereits existiert
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res
        .status(409)
        .send(
          generateLayout(
            "Error",
            "<h2>Error</h2><p>E-Mail oder Benutzername ist bereits vergeben.</p><p><a href='/register'>Zurück zur Registrierung</a></p>"
          )
        );
    }

    // 2. Passwort hashen
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Neuen Benutzer speichern
    user = new User({
      username,
      email,
      password: hashedPassword, // Gehashtes Passwort speichern
      role: "user",
    });
    await user.save();

    // 4. Erfolgsmeldung und Weiterleitung
    const successContent = `
            <h2>🎉 Registrierung erfolgreich!</h2>
            <p>Ihr Konto wurde erstellt. Sie können sich jetzt anmelden.</p>
            <p><a href="/login">Zum Login</a></p>
        `;
    res.send(generateLayout("Erfolg", successContent));
  } catch (err) {
    console.error("Registrierungsfehler:", err);
    res
      .status(500)
      .send(
        generateLayout(
          "Error",
          "<h2>Serverfehler</h2><p>Ein Fehler ist bei der Registrierung aufgetreten.</p>"
        )
      );
  }
});

module.exports = router;
