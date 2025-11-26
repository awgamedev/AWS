/**
 * Express Router für Authentifizierungs-Routen (Login, Register).
 * Diese Version verwendet die renderView-Utility für das Layout-Management.
 */
const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../user/user.model"); // NEU: User-Modell für Registrierung
const bcrypt = require("bcryptjs"); // used for password hashing
const { renderView } = require("../../utils/view-renderer"); // NEU: Import der View-Renderer Utility
const registrationEnabled = process.env.REGISTRATION_ENABLED !== "false";

// ------------------------------------------------------------------
// --- Login-Seite (GET /login) ---
router.get("/login", (req, res) => {
  const logger = req.logger; // Annahme: logger existiert

  // Daten für das EJS-Template vorbereiten
  const redirectPath = req.query.redirect || "/";
  const error = req.query.error; // Wenn error=true, wird die Fehlermeldung angezeigt
  const email = req.query.email || ""; // Zum Vorbefüllen der E-Mail
  const success = req.flash("success"); // Erfolgsmeldung (z.B. nach der Registrierung)

  logger.info(`Login-Seite aufgerufen. Redirect-Pfad: ${redirectPath}`);

  // Verwende renderView anstelle von res.render
  renderView(req, res, "login", "Anmelden", {
    error: error,
    redirectPath: redirectPath,
    email: email,
    success: success.length > 0 ? success[0] : null,
    registrationEnabled: registrationEnabled,
  });
});

// --- Login-Daten verarbeiten (POST /login) ---
router.post(
  "/login",
  passport.authenticate("local", {
    // Bei Fehlschlag zur Login-Seite mit Fehlermeldung zurückkehren
    failureRedirect: "/login?error=true",
    // Optional: E-Mail wieder mitgeben
    // failureRedirect: "/login?error=true&email=" + encodeURIComponent(req.body.email),
  }),
  (req, res) => {
    const encodedRedirectPath = req.body.redirect;
    let redirectPath = "/"; // Standardwert
    try {
      redirectPath = decodeURIComponent(encodedRedirectPath);
    } catch (e) {
      console.error("Fehler beim Dekodieren der Redirect-URL:", e);
      // Fallback auf Standardpfad
    }

    res.redirect(redirectPath);
  }
);

router.post("/logout", (req, res) => {
  // req.logout erwartet nun einen Callback-Funktion
  req.logout((err) => {
    if (err) {
      console.error("Logout Fehler:", err);
      // Optional: Error handling
    }
    res.redirect("/login");
  });
});

// ------------------------------------------------------------------
// --- Registrierungs-Formular (GET /register) ---
router.get("/register", (req, res) => {
  if (!registrationEnabled) {
    return res.status(403).send("Registrierung ist deaktiviert.");
  }
  // Verwende renderView anstelle von res.render
  renderView(req, res, "register", "Registrierung", {
    // Fehler und alte Formulardaten (falls POST fehlschlägt und man zurückgeleitet wird)
    error: req.flash("error"), // Nutze Flash Messages
    formData: req.flash("formData")[0] || {}, // Nutze Flash Messages für alte Daten
  });
});

// --- Registrierungs-Daten verarbeiten (POST /register) ---
router.post("/register", async (req, res) => {
  if (!registrationEnabled) {
    return res.status(403).send("Registrierung ist deaktiviert.");
  }
  const { username, email, password, confirmPassword } = req.body;

  let errors = [];

  // 1. Validierung
  if (!username || !email || !password || !confirmPassword) {
    errors.push("Alle Felder sind erforderlich.");
  }
  if (password !== confirmPassword) {
    errors.push("Die Passwörter stimmen nicht überein.");
  }
  if (password.length < 6) {
    errors.push("Das Passwort muss mindestens 6 Zeichen lang sein.");
  }

  if (errors.length > 0) {
    // Bei Validierungsfehlern: Daten und Fehler speichern und zurückleiten
    req.flash("error", errors);
    req.flash("formData", { username, email });
    return res.redirect("/register");
  }

  try {
    // 2. Prüfen, ob der Benutzer oder die E-Mail bereits existiert
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      errors.push("E-Mail oder Benutzername ist bereits vergeben.");
      req.flash("error", errors);
      req.flash("formData", { username, email });
      return res.redirect("/register");
    }

    // 3. Passwort hashen
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Neuen Benutzer speichern
    user = new User({
      username,
      email,
      password: hashedPassword,
      role: "user",
    });
    await user.save();

    // 5. Erfolgreiche Registrierung (Redirect zur Login-Seite)
    req.flash(
      "success",
      "Registrierung erfolgreich! Sie können sich jetzt anmelden."
    );
    res.redirect("/login");
  } catch (err) {
    console.error("Registrierungsfehler:", err);
    // Generischer Fehler
    req.flash("error", [
      "Ein Serverfehler ist bei der Registrierung aufgetreten.",
    ]);
    req.flash("formData", { username, email });
    res.redirect("/register");
  }
});

module.exports = router;
