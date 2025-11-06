/**
 * Express Router für Authentifizierungs-Routen (Login, Register)
 */
const express = require("express");
const router = express.Router();
const passport = require("passport");
const generateLayout = require("../utils/layout");
const User = require("../models/User"); // used to register new users
const bcrypt = require("bcryptjs"); // used for password hashing

// --- Funktion zum Hinzufügen von Links (angepasst an modernes Layout) ---
const getAuthLinks = (isLogin) => `
    <div class="mt-6 flex justify-between text-sm">
        ${
          isLogin
            ? `<a href="/register" class="text-indigo-600 hover:text-indigo-500">→ Hier registrieren</a>`
            : `<a href="/login" class="text-indigo-600 hover:text-indigo-500">← Zum Login</a>`
        }
        <a href="/" class="text-gray-600 hover:text-gray-500">Zur Startseite</a>
    </div>
`;

// ------------------------------------------------------------------
// --- Login-Seite (GET /login) ---
router.get("/login", (req, res) => {
  const logger = req.logger;

  const redirectPath = req.query.redirect || ""; // Setze einen leeren String, falls nicht vorhanden

  logger.info(`Login-Seite aufgerufen. Redirect-Pfad: ${redirectPath}`);

  // Fehlermeldung im modernen Stil
  const message = req.query.error
    ? '<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert"><p class="font-bold">Fehler:</p><p>Falsche E-Mail oder Passwort.</p></div>'
    : "";

  const content = `
        <div class="max-w-md mx-auto mt-10 p-8 bg-white shadow-xl rounded-lg border border-gray-100">
            <h2 class="text-3xl font-extrabold text-gray-900 mb-6 text-center">Anmelden 🔑</h2>
            ${message}
            <form action="/login" method="POST" class="space-y-4">
                <input type="hidden" name="redirect" value="${redirectPath}">

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
                    <input type="email" id="email" name="email" required 
                           value="${req.query.email || ""}"
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="ihre@email.de">
                </div>
                
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">Passwort</label>
                    <input type="password" id="password" name="password" required 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="Ihr Passwort">
                </div>
                
                <div class="pt-2">
                    <button type="submit" 
                            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                        Login
                    </button>
                </div>
            </form>
            ${getAuthLinks(true)}
        </div>
    `;

  res.send(generateLayout("Login", content, req.path, req.user));
});

// --- Login-Daten verarbeiten (POST /login) ---
router.post(
  "/login",
  passport.authenticate("local", {
    // Bei Fehlschlag immer zur Login-Seite mit Fehlermeldung zurückkehren
    failureRedirect: "/login?error=true", // Optional: E-Mail beibehalten? Siehe unten
  }),
  (req, res) => {
    const encodedRedirectPath = req.body.redirect;
    let redirectPath = "/"; // Standardwert
    try {
      // Hier wird der redirect-Wert aus dem POST-Body verwendet, der aus dem Hidden-Field kommt
      redirectPath = decodeURIComponent(encodedRedirectPath);
    } catch (e) {
      console.error("Fehler beim Dekodieren der Redirect-URL:", e);
    }

    res.redirect(redirectPath);
  }
);

router.post("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

// ------------------------------------------------------------------
// --- Registrierungs-Formular (GET /register) ---
router.get("/register", (req, res) => {
  const content = `
        <div class="max-w-md mx-auto mt-10 p-8 bg-white shadow-xl rounded-lg border border-gray-100">
            <h2 class="text-3xl font-extrabold text-gray-900 mb-6 text-center">Neues Konto erstellen ✍️</h2>
            <form action="/register" method="POST" class="space-y-4">
                
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700">Benutzername</label>
                    <input type="text" id="username" name="username" required 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition duration-150 ease-in-out"
                           placeholder="Ihr Wunsch-Benutzername">
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
                    <input type="email" id="email" name="email" required 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition duration-150 ease-in-out"
                           placeholder="neue@adresse.de">
                </div>
                
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">Passwort</label>
                    <input type="password" id="password" name="password" required 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition duration-150 ease-in-out"
                           placeholder="Mindestens 6 Zeichen">
                </div>
                
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Passwort bestätigen</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" required 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition duration-150 ease-in-out"
                           placeholder="Passwort wiederholen">
                </div>

                <div class="pt-2">
                    <button type="submit" 
                            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out">
                        Registrieren
                    </button>
                </div>
            </form>
            ${getAuthLinks(false)}
        </div>
    `;
  res.send(generateLayout("Registrierung", content, req.path, req.user));
});

// --- Registrierungs-Daten verarbeiten (POST /register) ---
router.post("/register", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // Überprüfung der Pflichtfelder (könnte auch besser mit Flash Messages gelöst werden)
  if (!username || !email || !password || !confirmPassword) {
    return res
      .status(400)
      .send(
        generateLayout(
          "Error",
          `<h2>Fehler</h2><div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert"><p>Alle Felder sind erforderlich.</p><p><a href='/register' class="underline">Zurück zur Registrierung</a></p></div>`,
          req.path,
          req.user
        )
      );
  }

  // Passwort-Check
  if (password !== confirmPassword) {
    return res
      .status(400)
      .send(
        generateLayout(
          "Error",
          `<h2>Fehler</h2><div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert"><p>Die Passwörter stimmen nicht überein.</p><p><a href='/register' class="underline">Zurück zur Registrierung</a></p></div>`,
          req.path,
          req.user
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
            `<h2>Fehler</h2><div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert"><p>E-Mail oder Benutzername ist bereits vergeben.</p><p><a href='/register' class="underline">Zurück zur Registrierung</a></p></div>`,
            req.path,
            req.user
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

    // 4. Erfolgsmeldung (ähnlich der Bearbeiten/Erstellen-Erfolgsseite)
    const successContent = `
            <div class="max-w-md mx-auto mt-10 p-8 bg-white shadow-xl rounded-lg border border-green-200 text-center">
                <h2 class="text-3xl font-extrabold text-green-700 mb-4">🎉 Registrierung erfolgreich!</h2>
                <p class="text-lg text-gray-700 mb-6">Ihr Konto wurde erstellt. Sie können sich jetzt anmelden.</p>
                <a href="/login" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                    Zum Login →
                </a>
            </div>
        `;
    res.send(generateLayout("Erfolg", successContent, req.path, req.user));
  } catch (err) {
    console.error("Registrierungsfehler:", err);
    res
      .status(500)
      .send(
        generateLayout(
          "Error",
          `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert"><p>Ein Serverfehler ist bei der Registrierung aufgetreten.</p></div>`,
          req.path
        )
      );
  }
});

module.exports = router;
