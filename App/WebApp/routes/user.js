const express = require("express");
const router = express.Router();
const User = require("../models/User");
const generateLayout = require("../utils/layout"); // <--- IMPORT THE LAYOUT

const passport = require("passport"); // Wichtig für den Aufruf der Authentifizierung
const { ensureAuthenticated, checkRole } = require("../middleware/auth"); // <-- NUR IMPORTIEREN!

// --- Route: Submit Message Form (GET /message) ---
router.get("/user-list", ensureAuthenticated, async (req, res) => {
  // 2. Führe die Datenbankabfrage durch und warte auf das Ergebnis
  let users;
  try {
    // Holen Sie alle Benutzer aus der Datenbank. Das Ergebnis ist ein Array.
    users = await User.find({});
  } catch (err) {
    console.error("Fehler beim Abrufen der Benutzerliste:", err);
    // Im Fehlerfall: Senden Sie eine Fehlermeldung an den Benutzer
    return res
      .status(500)
      .send(generateLayout("Fehler", "Fehler beim Laden der Nutzerliste."));
  }

  // 3. Nun können Sie das 'users'-Array mappen
  const content = `
        <h2>Nutzer-Liste</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nutzername</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">E-Mail</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Rolle</th>
                </tr>
            </thead>
            <tbody>
                ${users
                  .map(
                    // <--- HIER DAS NEUE 'users'-ARRAY VERWENDEN
                    (user) => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${user.username}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${user.email}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${user.role}</td>
                        </tr>
                    `
                  )
                  .join("")}
            </tbody>
        </table>
    `;

  res.send(generateLayout("Nutzer-Liste", content));
});

// Export the router
module.exports = router;
