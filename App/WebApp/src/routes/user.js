const express = require("express");
const router = express.Router();
const User = require("../models/User");
const generateLayout = require("../utils/layout");
const bcrypt = require("bcryptjs");

const passport = require("passport");
const { ensureAuthenticated } = require("../middleware/auth");

// -------------------------------------------------------------------
// 🔥 1. Route: Benutzerlisten-Ansicht (GET /user-list)
// -------------------------------------------------------------------
router.get("/user-list", ensureAuthenticated, async (req, res) => {
  let users;
  try {
    users = await User.find({});
  } catch (err) {
    console.error("Fehler beim Abrufen der Benutzerliste:", err);
    return res
      .status(500)
      .send(
        generateLayout("Fehler", "Fehler beim Laden der Nutzerliste.", req.path)
      );
  }

  const content = `
    <link rel="stylesheet" href="/css/table.css">

    <div class="p-4 sm:p-6 lg:p-8">
      <h2 class="text-3xl font-extrabold text-gray-900 mb-6">Nutzer-Liste 🧑‍💻</h2>
      
      <div class="mb-6 flex justify-end">
        <a href="/modify-user" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          ➕ Neuen Nutzer erstellen
        </a>
      </div>

      <div class="mb-4">
        <input 
          type="text" 
          id="userSearch" 
          placeholder="Nach Benutzer, E-Mail oder Rolle suchen..." 
          class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
      </div>
            
      <div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg relative max-h-96 overflow-y-auto">
        <table id="userTable" class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer sortable sticky-col border-r border-gray-200" data-column="username">
                Nutzername <span></span>
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer sortable border-r border-gray-200" data-column="email">
                E-Mail <span></span>
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer sortable border-r border-gray-200" data-column="role">
                Rolle <span></span>
              </th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody id="userTableBody" class="bg-white divide-y divide-gray-200">
            ${users
              .map(
                (user) => `
                <tr data-username="${user.username}" data-email="${user.email}" data-role="${user.role}">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky-col border-r border-gray-200">${user.username}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">${user.email}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">${user.role}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="/modify-user/${user._id}" class="text-indigo-600 hover:text-indigo-900 mr-4">
                      Bearbeiten ✏️
                    </a>
                    <a href="/confirm-delete-user/${user._id}" class="text-red-600 hover:text-red-900">
                      Löschen 🗑️
                    </a>
                  </td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <script src="/js/table.js"></script>
    `;

  res.send(generateLayout("Nutzer-Liste", content, req.path));
});

// -------------------------------------------------------------------
// 🔥 2. Route: BEARBEITEN/ERSTELLEN ANZEIGEN (GET /modify-user/:id? oder /modify-user)
// -------------------------------------------------------------------

// Funktion, die die gesamte Logik für das Anzeigen des Formulars enthält
async function handleModifyUserGet(req, res) {
  const userId = req.params.id; // Kann undefined sein
  let userToModify = {};
  const isEditing = !!userId;
  const title = isEditing
    ? "Nutzer bearbeiten ✍️"
    : "Neuen Nutzer erstellen 📝";
  const submitText = isEditing ? "Änderungen speichern" : "💾 Nutzer speichern";

  // Wenn eine ID vorhanden ist, Daten des Benutzers abrufen
  if (isEditing) {
    try {
      userToModify = await User.findById(userId);
      if (!userToModify) {
        return res
          .status(404)
          .send(generateLayout("Fehler", "Nutzer nicht gefunden.", req.path));
      }
    } catch (err) {
      console.error("Fehler beim Abrufen der Nutzerdaten:", err);
      return res
        .status(500)
        .send(
          generateLayout(
            "Fehler",
            "Fehler beim Laden der Nutzerdetails.",
            req.path
          )
        );
    }
  }

  // Hilfsfunktion für ausgewähltes <option>
  const getSelected = (role) => (userToModify.role === role ? "selected" : "");

  // ... (Der gesamte HTML-Code, den Sie bereits hatten, folgt hier) ...
  const formContent = `
        <div class="max-w-md mx-auto mt-10 p-6 bg-white shadow-xl rounded-lg border border-gray-100">
            <h2 class="text-3xl font-extrabold mb-8 text-gray-900 text-center">${title}</h2>
            
            <form action="/modify-user" method="POST" class="space-y-6">
                ${
                  isEditing
                    ? `<input type="hidden" name="userId" value="${userToModify._id}">`
                    : ""
                }
                
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700">Nutzername</label>
                    <input type="text" id="username" name="username" required 
                           value="${userToModify.username || ""}"
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="Max Mustermann">
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
                    <input type="email" id="email" name="email" required 
                           value="${userToModify.email || ""}"
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="max.mustermann@firma.de">
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">${
                      isEditing ? "Neues Passwort (optional)" : "Passwort *"
                    }</label>
                    <input type="password" id="password" name="password" ${
                      isEditing ? "" : "required"
                    } 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="${
                             isEditing
                               ? "Leer lassen, um Passwort nicht zu ändern"
                               : "Mindestens 6 Zeichen"
                           }">
                </div>
                
                <div>
                    <label for="role" class="block text-sm font-medium text-gray-700">Rolle</label>
                    <select id="role" name="role" 
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out">
                        <option value="user" ${getSelected(
                          "user"
                        )}>User</option>
                        <option value="admin" ${getSelected(
                          "admin"
                        )}>Admin</option>
                        <option value="moderator" ${getSelected(
                          "moderator"
                        )}>Moderator</option>
                    </select>
                </div>

                <div class="pt-4">
                    <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out">
                        ${submitText}
                    </button>
                    <a href="/user-list" class="mt-3 block w-full text-center py-2 px-4 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition duration-150 ease-in-out">
                        Abbrechen
                    </a>
                </div>
            </form>
        </div>
    `;

  res.send(generateLayout(title, formContent, req.path));
}

// 1. Route für Bearbeiten (mit ID)
router.get("/modify-user/:id", ensureAuthenticated, handleModifyUserGet);

// 2. Route für Erstellen (ohne ID)
router.get("/modify-user", ensureAuthenticated, handleModifyUserGet);

// -------------------------------------------------------------------
// 🔥 3. Route: BENUTZER ERSTELLEN/SPEICHERN (POST /modify-user)
// -------------------------------------------------------------------
router.post("/modify-user", ensureAuthenticated, async (req, res) => {
  // Daten aus dem Formular (req.body) extrahieren
  const { userId, username, email, password, role = "user" } = req.body;
  const isEditing = !!userId;

  // Grundlegende Validierung
  if (!username || !email || (!isEditing && !password)) {
    return res
      .status(400)
      .send(
        generateLayout(
          "Fehler",
          "Bitte füllen Sie alle notwendigen Felder aus.",
          req.path
        )
      );
  }

  try {
    // --- 1. Bearbeiten eines bestehenden Nutzers ---
    if (isEditing) {
      let user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .send(generateLayout("Fehler", "Nutzer nicht gefunden.", req.path));
      }

      // 1a. Prüfe, ob die E-Mail geändert wurde und bereits existiert (außer beim aktuellen Nutzer)
      if (email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res
            .status(400)
            .send(
              generateLayout(
                "Fehler",
                "Diese E-Mail wird bereits verwendet.",
                req.path
              )
            );
        }
      }

      // 1b. Daten aktualisieren
      user.username = username;
      user.email = email;
      user.role = role;

      // 1c. Passwort nur aktualisieren, wenn ein neues eingegeben wurde
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      await user.save();
      res.redirect("/user-list");

      // --- 2. Erstellen eines neuen Nutzers ---
    } else {
      // 2a. Prüfen, ob der Nutzer bereits existiert
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

      // 2b. Passwort hashen
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 2c. Neuen Benutzer erstellen und speichern
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        role,
      });

      await newUser.save();
      res.redirect("/user-list");
    }
  } catch (err) {
    console.error("Fehler beim Speichern des Benutzers:", err);
    return res
      .status(500)
      .send(
        generateLayout("Fehler", "Fehler beim Speichern des Nutzers.", req.path)
      );
  }
});

// -------------------------------------------------------------------
// 🔥 4. Route: LÖSCHBESTÄTIGUNGSSEITE ANZEIGEN (GET /confirm-delete-user/:id)
// -------------------------------------------------------------------
router.get(
  "/confirm-delete-user/:id",
  ensureAuthenticated,
  async (req, res) => {
    const userId = req.params.id;
    let userToDelete;

    try {
      userToDelete = await User.findById(userId);

      if (!userToDelete) {
        return res
          .status(404)
          .send(generateLayout("Fehler", "Nutzer nicht gefunden.", req.path));
      }
    } catch (err) {
      console.error("Fehler beim Abrufen der Nutzerdaten:", err);
      return res
        .status(500)
        .send(
          generateLayout("Fehler", "Fehler beim Laden der Details.", req.path)
        );
    }

    const content = `
        <div class="max-w-xl mx-auto mt-10 p-8 bg-white shadow-2xl rounded-lg border border-red-200">
            <h2 class="text-3xl font-extrabold text-red-700 mb-6 text-center">Wirklich löschen? ⚠️</h2>
            
            <p class="text-lg text-gray-700 mb-6 text-center">
                Sind Sie sicher, dass Sie diesen Nutzer **dauerhaft** löschen möchten? 
                Diese Aktion kann **nicht** rückgängig gemacht werden.
            </p>

            <div class="border border-gray-200 p-4 rounded-md mb-8 bg-gray-50">
                <h3 class="text-xl font-bold mb-2 text-gray-800">Nutzer-Details</h3>
                <p class="text-sm text-gray-600"><strong>ID:</strong> ${userToDelete._id}</p>
                <p class="text-sm text-gray-600"><strong>Nutzername:</strong> ${userToDelete.username}</p>
                <p class="text-sm text-gray-600"><strong>E-Mail:</strong> ${userToDelete.email}</p>
                <p class="text-sm text-gray-600"><strong>Rolle:</strong> ${userToDelete.role}</p>
            </div>

            <div class="flex justify-between space-x-4">
                <form action="/delete-user/${userToDelete._id}" method="POST" class="w-1/2">
                    <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out">
                        🗑️ Ja, endgültig löschen
                    </button>
                </form>

                <a href="/user-list" class="w-1/2 flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                    Abbrechen
                </a>
            </div>
        </div>
    `;

    res.send(generateLayout("Löschen bestätigen", content, req.path));
  }
);

// -------------------------------------------------------------------
// 🔥 5. Route: ENDGÜLTIGE AKTION: BENUTZER LÖSCHEN (POST /delete-user/:id)
// -------------------------------------------------------------------
router.post("/delete-user/:id", ensureAuthenticated, async (req, res) => {
  const userId = req.params.id;
  try {
    var user = await User.findByIdAndDelete(userId);
    if (user) {
      res.redirect("/user-list");
    } else {
      res
        .status(404)
        .send(generateLayout("Fehler", "Nutzer nicht gefunden.", req.path));
    }
  } catch (err) {
    console.error("Fehler beim Löschen des Nutzers:", err);
    return res
      .status(500)
      .send(
        generateLayout("Fehler", "Fehler beim Löschen des Nutzers.", req.path)
      );
  }
});

module.exports = router;
