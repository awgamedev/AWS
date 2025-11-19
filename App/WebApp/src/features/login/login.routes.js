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
const jwt = require("jsonwebtoken"); // Für Access Token (kurzlebig)
const crypto = require("crypto"); // Für Refresh Token (opaque random)

// ------------------------------------------------------------------
// --- Login-Seite (GET /login) ---
router.get("/login", (req, res) => {
  const logger = req.logger; // Annahme: logger existiert

  // Daten für das EJS-Template vorbereiten
  const redirectPath = req.query.redirect || "/";
  const error = req.query.error; // Wenn error=true, wird die Fehlermeldung angezeigt
  const email = req.query.email || ""; // Zum Vorbefüllen der E-Mail
  const rememberMe = req.query.rememberMe === "true"; // Vorbelegung Checkbox
  const success = req.flash("success"); // Erfolgsmeldung (z.B. nach der Registrierung)

  logger.info(`Login-Seite aufgerufen. Redirect-Pfad: ${redirectPath}`);

  // Verwende renderView anstelle von res.render
  renderView(req, res, "login", "Anmelden", {
    error: error,
    redirectPath: redirectPath,
    email: email,
    rememberMe: rememberMe,
    success: success.length > 0 ? success[0] : null,
  });
});

// --- Login-Daten verarbeiten (POST /login) ---
router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login?error=true",
  }),
  async (req, res) => {
    const encodedRedirectPath = req.body.redirect;
    let redirectPath = "/"; // Standardwert
    try {
      redirectPath = decodeURIComponent(encodedRedirectPath);
    } catch (e) {
      console.error("Fehler beim Dekodieren der Redirect-URL:", e);
      // Fallback auf Standardpfad
    }

    const rememberMe = !!req.body.rememberMe;

    // Session-Cookie dynamisch anpassen
    if (rememberMe) {
      try {
        const secret = process.env.JWT_SECRET;
        if (secret && req.user) {
          // Kurzlebiges Access Token (15 Minuten)
          const accessToken = jwt.sign({ id: req.user.id }, secret, {
            expiresIn: "15m",
          });
          res.cookie("auth_token", accessToken, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            maxAge: 15 * 60 * 1000,
          });

          // Langlebiges Refresh Token (opaque)
          const refreshRaw = crypto.randomBytes(32).toString("hex");
          const refreshCookieValue = `${req.user.id}.${refreshRaw}`;
          const refreshHash = crypto
            .createHash("sha256")
            .update(refreshRaw)
            .digest("hex");

          // Speichere Hash in User-Dokument
          req.user.refreshTokens = req.user.refreshTokens || [];
          req.user.refreshTokens.push({ tokenHash: refreshHash });
          await req.user.save();

          res.cookie("refresh_token", refreshCookieValue, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Tage
          });
        }
        if (req.session && req.session.cookie) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        }
      } catch (err) {
        console.error("Fehler beim Erstellen von Access/Refresh Tokens:", err);
      }
    } else {
      // Sitzung nur bis Browser-Ende
      if (req.session && req.session.cookie) {
        req.session.cookie.expires = false;
        req.session.cookie.maxAge = null;
      }
      res.clearCookie("auth_token");
      res.clearCookie("refresh_token");
    }

    res.redirect(redirectPath);
  }
);

router.post("/logout", async (req, res) => {
  const refreshCookie = req.cookies ? req.cookies.refresh_token : null;
  // req.logout erwartet Callback
  req.logout(async (err) => {
    if (err) {
      console.error("Logout Fehler:", err);
    }
    // Entferne Tokens für dieses Gerät (Refresh Hash)
    if (refreshCookie) {
      const parts = refreshCookie.split(".");
      if (parts.length === 2) {
        const userId = parts[0];
        const raw = parts[1];
        try {
          if (req.user && req.user.id === userId) {
            const hash = crypto.createHash("sha256").update(raw).digest("hex");
            req.user.refreshTokens = (req.user.refreshTokens || []).filter(
              (t) => t.tokenHash !== hash
            );
            await req.user.save();
          }
        } catch (ex) {
          console.error("Fehler beim Entfernen des Refresh Tokens:", ex);
        }
      }
    }
    res.clearCookie("auth_token");
    res.clearCookie("refresh_token");
    res.redirect("/login");
  });
});

// ------------------------------------------------------------------
// --- Registrierungs-Formular (GET /register) ---
router.get("/register", (req, res) => {
  // Verwende renderView anstelle von res.render
  renderView(req, res, "register", "Registrierung", {
    // Fehler und alte Formulardaten (falls POST fehlschlägt und man zurückgeleitet wird)
    error: req.flash("error"), // Nutze Flash Messages
    formData: req.flash("formData")[0] || {}, // Nutze Flash Messages für alte Daten
  });
});

// --- Registrierungs-Daten verarbeiten (POST /register) ---
router.post("/register", async (req, res) => {
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
