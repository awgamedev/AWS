const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
// Importiere Hilfsfunktionen (diese sollten in Ihrer Umgebung existieren)
const generateLayout = require("../utils/layout");
const { ensureAuthenticated } = require("../middleware/auth");

const renderUserListContent = (items, reqPath) => {
  // Beispielhafte, statische Rückgabe, die die Daten anzeigt (ersetzt renderList)
  let tableBodyHtml = items
    .map(
      (item) => `
        <tr data-id="${item._id}">
            <td class="px-6 py-3 text-left text-sm font-medium text-gray-900">${item.username}</td>
            <td class="px-6 py-3 text-left text-sm font-medium text-gray-900">${item.email}</td>
            <td class="px-6 py-3 text-left text-sm font-medium text-gray-900">${item.role}</td>
            <td class="px-6 py-3 text-right">
                <div class="flex justify-end gap-2">
                    <a href="/modify-user/${item._id}" 
                       class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                        <span>✏️</span>
                        <span class="ml-1">Bearbeiten</span>
                    </a>
                    <a href="/user-list/confirm-delete/${item._id}"
                       class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors">
                        <span>🗑️</span>
                        <span class="ml-1">Löschen</span>
                    </a>
                </div>
            </td>
        </tr>
    `
    )
    .join("");

  return `
        <link rel="stylesheet" href="/css/table.css">
        <div class="p-4 sm:p-6 lg:p-8">
            <h2 class="text-3xl font-extrabold text-gray-900 mb-6">Nutzer-Liste 🧑‍💻 🚀</h2>
            
            <div class="mb-6 flex justify-end">
                <a href="/create-user" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                    ➕ Neuen Nutzer erstellen
                </a>
            </div>

            <div class="mb-4">
                <input type="text" id="entitySearch" placeholder="Suchen nach Nutzername, E-Mail, Rolle..." class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm">
            </div>
            
            <div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg relative max-h-96 overflow-y-auto">
                <table id="entityTable" class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nutzername</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rolle</th>
                            <th scope="col" class="relative px-6 py-3"><span class="sr-only">Aktionen</span></th>
                        </tr>
                    </thead>
                    <tbody id="entityTableBody" class="bg-white divide-y divide-gray-200">
                        ${tableBodyHtml}
                    </tbody>
                </table>
            </div>
        </div>
        <script src="/js/table.js"></script>
    `;
};

/**
 * Generiert den HTML-Inhalt für das Formular (Erstellen/Bearbeiten).
 * MUSS ERSETZT werden, wenn Sie die generische View nicht mehr verwenden.
 */
const renderModifyUserForm = (entityToModify = {}, isEditing, reqPath) => {
  // Annahme: entityToModify enthält _id, username, email, role
  const isEditingLocal = isEditing || !!entityToModify._id;
  const title = isEditingLocal
    ? "Nutzer bearbeiten ✍️"
    : "Neuen Nutzer erstellen 📝";
  const submitText = isEditingLocal
    ? "💾 Änderungen speichern"
    : "💾 Nutzer speichern";
  const entityIdInput = isEditingLocal
    ? `<input type="hidden" name="id" value="${entityToModify._id}">`
    : "";
  const formAction = isEditingLocal ? "/modify-user" : "/create-user";

  // Werte für das Formular
  const currentUsername = entityToModify.username || "";
  const currentEmail = entityToModify.email || "";
  const currentRole = entityToModify.role || "user";

  // Vereinfachte Select-Optionen
  const roleOptions = [
    { value: "user", label: "User" },
    { value: "admin", label: "Admin" },
    { value: "moderator", label: "Moderator" },
  ]
    .map(
      (option) =>
        `<option value="${option.value}" ${
          currentRole === option.value ? "selected" : ""
        }>${option.label}</option>`
    )
    .join("");

  return `
        <div class="max-w-md mx-auto mt-10 p-6 bg-white shadow-xl rounded-lg border border-gray-100">
            <h2 class="text-3xl font-extrabold mb-8 text-gray-900 text-center">${title}</h2>
            
            <form action="${formAction}" method="POST" class="space-y-6">
                ${entityIdInput}
                
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700">Nutzername</label>
                    <input type="text" id="username" name="username" required value="${currentUsername}"
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="Max Mustermann">
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
                    <input type="email" id="email" name="email" required value="${currentEmail}"
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="max.mustermann@firma.de">
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">Passwort</label>
                    <input type="password" id="password" name="password" 
                           ${!isEditingLocal ? "required" : ""}
                           class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                           placeholder="${
                             isEditingLocal
                               ? "Leer lassen, um Passwort nicht zu ändern"
                               : "Mindestens 6 Zeichen"
                           }">
                </div>

                <div>
                    <label for="role" class="block text-sm font-medium text-gray-700">Rolle</label>
                    <select id="role" name="role"
                            class="mt-1 block w-full px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out">
                        ${roleOptions}
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
};

/**
 * Generiert den HTML-Inhalt für die Löschbestätigung.
 * MUSS ERSETZT werden, wenn Sie die generische View nicht mehr verwenden.
 */
const renderConfirmDeleteUser = (entityToDelete, reqPath) => {
  // Vereinfachte Detailansicht
  const detailHtml = Object.keys(entityToDelete)
    .filter((key) => key !== "password" && key !== "__v")
    .map(
      (key) => `
            <p class="text-sm text-gray-600">
                <strong>${
                  key.charAt(0).toUpperCase() + key.slice(1)
                }:</strong> ${entityToDelete[key]}
            </p>
        `
    )
    .join("");

  return `
        <div class="max-w-xl mx-auto mt-10 p-8 bg-white shadow-2xl rounded-lg border border-red-200">
            <h2 class="text-3xl font-extrabold text-red-700 mb-6 text-center">Wirklich Nutzer löschen? ⚠️</h2>
            
            <p class="text-lg text-gray-700 mb-6 text-center">
                Sind Sie sicher, dass Sie diesen Nutzer **dauerhaft** löschen möchten? 
                Diese Aktion kann **nicht** rückgängig gemacht werden.
            </p>

            <div class="border border-gray-200 p-4 rounded-md mb-8 bg-gray-50">
                <h3 class="text-xl font-bold mb-2 text-gray-800">Nutzer-Details</h3>
                ${detailHtml}
            </div>

            <div class="flex justify-between space-x-4">
                <form action="/user-list/delete/${entityToDelete._id}" method="POST" class="w-1/2">
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
};
// 1. Liste anzeigen (GET /user-list)
router.get("/user-list", ensureAuthenticated, async (req, res) => {
  let items;
  try {
    items = await User.find({});
  } catch (err) {
    console.error("Fehler beim Abrufen der Nutzer-Liste:", err);
    return res
      .status(500)
      .send(
        generateLayout(
          "Fehler",
          "Fehler beim Laden der Nutzer-Liste.",
          req.path
        )
      );
  } // Direkte Aufruf der spezifischen View-Funktion

  const content = renderUserListContent(items, req.path);
  res.send(generateLayout("Nutzer-Liste 🧑‍💻", content, req.path));
});

// 2a. FORMULAR ANZEIGEN: Neuen Nutzer erstellen (GET /create-user)
// Diese Route zeigt immer das leere Erstellungsformular an.
router.get("/create-user", ensureAuthenticated, (req, res) => {
  const isEditing = false;
  const title = "Neuen Nutzer erstellen 📝"; // entityToModify ist leer, isEditing ist false
  const content = renderModifyUserForm({}, isEditing, req.path);
  res.send(generateLayout(title, content, req.path));
});

// 3a. AKTION: Neuen Nutzer speichern (POST /create-user)
// Diese Route verarbeitet nur das Speichern eines NEUEN Nutzers.
router.post("/create-user", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  const { email, password } = data;

  try {
    // Passwort-Prüfung und Hashing
    if (!password) {
      throw new Error(
        "Passwort ist beim Erstellen eines neuen Nutzers erforderlich."
      );
    }
    if (password.length < 6) {
      throw new Error("Das Passwort muss mindestens 6 Zeichen lang sein.");
    }
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(password, salt); // E-Mail-Eindeutigkeit prüfen

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Ein Nutzer mit dieser E-Mail existiert bereits.");
    }

    const newUser = new User(data);
    await newUser.save();
    res.redirect("/user-list");
  } catch (err) {
    console.error("Fehler beim Erstellen des Nutzers:", err);
    return res
      .status(500)
      .send(
        generateLayout(
          "Fehler",
          err.message || `Fehler beim Erstellen des Nutzers.`,
          req.path
        )
      );
  }
});

// 2b. FORMULAR ANZEIGEN: Bestehenden Nutzer bearbeiten (GET /modify-user/:id)
// Diese Route benötigt IMMER eine :id und lädt die Daten.
router.get("/modify-user/:id", ensureAuthenticated, async (req, res) => {
  const itemId = req.params.id;
  const isEditing = true;
  let entityToModify = {};

  try {
    entityToModify = await User.findById(itemId);
    if (!entityToModify) {
      return res
        .status(404)
        .send(generateLayout("Fehler", "Nutzer nicht gefunden.", req.path));
    }
  } catch (err) {
    console.error("Fehler beim Abrufen der Nutzer-Daten:", err);
    return res
      .status(500)
      .send(
        generateLayout(
          "Fehler",
          "Fehler beim Laden der Nutzer-Details.",
          req.path
        )
      );
  } // Direkte Aufruf der spezifischen View-Funktion

  const content = renderModifyUserForm(
    entityToModify.toObject ? entityToModify.toObject() : entityToModify,
    isEditing,
    req.path
  );
  res.send(generateLayout("Nutzer bearbeiten ✍️", content, req.path));
});

// 3b. AKTION: Bestehenden Nutzer speichern (POST /modify-user)
// Diese Route verarbeitet nur die Aktualisierung eines BESTEHENDEN Nutzers (mit id im body).
router.post("/modify-user", ensureAuthenticated, async (req, res) => {
  const { id } = req.body;
  const data = req.body;

  try {
    let entity = await User.findById(id);
    if (!entity) {
      return res
        .status(404)
        .send(generateLayout("Fehler", "Nutzer nicht gefunden.", req.path));
    } // 🔥 Entity-spezifischer Hook (direkt hier integriert)

    const { email, password } = data; // E-Mail-Eindeutigkeit prüfen (nur wenn E-Mail geändert wurde)

    if (email !== entity.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error(
          "Diese E-Mail wird bereits von einem anderen Nutzer verwendet."
        );
      }
    } // Passwort-Hashing (nur wenn ein neues Passwort bereitgestellt wurde)

    if (password) {
      if (password.length < 6) {
        throw new Error("Das Passwort muss mindestens 6 Zeichen lang sein.");
      }
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
      entity.password = data.password; // Wichtig für Mongoose Update
    } else {
      delete data.password; // Entferne es aus den zu speichernden Daten
    } // Daten aktualisieren

    entity.username = data.username;
    entity.email = data.email;
    entity.role = data.role || "user";

    await entity.save();
    res.redirect("/user-list");
  } catch (err) {
    console.error("Fehler beim Speichern des Nutzers:", err); // Fehlerbehandlung, falls kein generisches View-System vorhanden ist
    return res
      .status(500)
      .send(
        generateLayout(
          "Fehler",
          err.message || `Fehler beim Aktualisieren des Nutzers.`,
          req.path
        )
      );
  }
});

// 4. LÖSCHBESTÄTIGUNGSSEITE ANZEIGEN (GET /user-list/confirm-delete/:id)
// ... (Die Routen 4 und 5 bleiben unverändert) ...

router.get(
  "/user-list/confirm-delete/:id",
  ensureAuthenticated,
  async (req, res) => {
    const itemId = req.params.id;
    let entityToDelete;

    try {
      entityToDelete = await User.findById(itemId);
      if (!entityToDelete) {
        return res
          .status(404)
          .send(generateLayout("Fehler", "Nutzer nicht gefunden.", req.path));
      }
    } catch (err) {
      console.error("Fehler beim Abrufen der Nutzer-Daten für Löschung:", err);
      return res
        .status(500)
        .send(
          generateLayout("Fehler", "Fehler beim Laden der Details.", req.path)
        );
    } // Direkte Aufruf der spezifischen View-Funktion

    const content = renderConfirmDeleteUser(
      entityToDelete.toObject(),
      req.path
    );
    res.send(generateLayout("Löschen bestätigen", content, req.path));
  }
);

// 5. ENDGÜLTIGE AKTION: ENTITÄT LÖSCHEN (POST /user-list/delete/:id)
router.post("/user-list/delete/:id", ensureAuthenticated, async (req, res) => {
  const itemId = req.params.id;
  try {
    const deletedItem = await User.findByIdAndDelete(itemId);
    if (deletedItem) {
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
