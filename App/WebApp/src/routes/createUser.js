const express = require("express");
const router = express.Router();
const User = require("../models/User");
const generateLayout = require("../utils/layout");
// Stellen Sie sicher, dass Sie bcrypt installiert haben: npm install bcryptjs
const bcrypt = require("bcryptjs"); // WICHTIG: Zum Hashen von Passwörtern

const { ensureAuthenticated } = require("../middleware/auth");

// -------------------------------------------------------------------
// 🔥 NEUE ROUTE: FORMULAR ANZEIGEN (GET /create-user)
// -------------------------------------------------------------------
router.get("/create-user", ensureAuthenticated, (req, res) => {
  // Einfaches HTML-Formular mit Tailwind-Klassen
  const formContent = `
        <div class="max-w-md mx-auto mt-10 p-6 bg-white shadow-xl rounded-lg border border-gray-100">
            <h2 class="text-3xl font-extrabold mb-8 text-gray-900 text-center">Neuen Nutzer erstellen 📝</h2>
            
            <form action="/create-user" method="POST" class="space-y-6">
                
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700">Nutzername</label>
                    <input type="text" id="username" name="username" required 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="Max Mustermann">
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
                    <input type="email" id="email" name="email" required 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="max.mustermann@firma.de">
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">Passwort</label>
                    <input type="password" id="password" name="password" required 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="Mindestens 6 Zeichen">
                </div>
                
                <div>
                    <label for="role" class="block text-sm font-medium text-gray-700">Rolle</label>
                    <select id="role" name="role" 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                    </select>
                </div>

                <div class="pt-4">
                    <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out">
                        💾 Nutzer speichern
                    </button>
                    <a href="/user-list" class="mt-3 block w-full text-center py-2 px-4 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition duration-150 ease-in-out">
                        Abbrechen
                    </a>
                </div>
            </form>
        </div>
    `;
  res.send(generateLayout("Nutzer erstellen", formContent, req.path));
});

// -------------------------------------------------------------------
// 🔥 NEUE ROUTE: BENUTZER SPEICHERN (POST /create-user)
// -------------------------------------------------------------------
router.post("/create-user", ensureAuthenticated, async (req, res) => {
  // Daten aus dem Formular (req.body) extrahieren
  const { username, email, password, role = "user" } = req.body;

  // Einfache Validierung
  if (!username || !email || !password) {
    // Im Falle fehlender Daten zurückleiten oder Fehlermeldung anzeigen
    return res
      .status(400)
      .send(generateLayout("Fehler", "Bitte alle Felder ausfüllen.", req.path));
  }

  try {
    // 1. Prüfen, ob der Nutzer bereits existiert
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .send(
          generateLayout(
            "Fehler",
            "Ein Nutzer mit dieser E-Mail existiert bereits.",
            req.path
          )
        );
    }

    // 2. Passwort hashen (WICHTIG!)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Neuen Benutzer erstellen und speichern
    const newUser = new User({
      username,
      email,
      password: hashedPassword, // Gehashtes Passwort speichern
      role,
    });

    await newUser.save();

    // 4. Weiterleitung zur Benutzerliste nach erfolgreicher Speicherung
    res.redirect("/user-list");
  } catch (err) {
    console.error("Fehler beim Erstellen des Benutzers:", err);
    // Im Fehlerfall: Benutzer informieren
    return res
      .status(500)
      .send(
        generateLayout("Fehler", "Fehler beim Erstellen des Nutzers.", req.path)
      );
  }
});

// ... (bestehende router.get("/user-list", ...))

module.exports = router;
