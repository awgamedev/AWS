// src/routes/user.js (Verwendet den generischen CRUD Controller)

const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
// Importiere Hilfsfunktionen (diese sollten in Ihrer Umgebung existieren)
const generateLayout = require("../utils/layout");
const { ensureAuthenticated } = require("../middleware/auth");

// Importiere den generischen Controller
const createCrudRouter = require("../utils/crudController");

// -------------------------------------------------------------------
// 🔥 Entity-spezifischer Hook für Nutzer (Passwort-Hashing & E-Mail-Validierung)
// -------------------------------------------------------------------
const userPreSaveHook = async ({ data, entity, Model, isEditing }) => {
  const { email, password } = data;

  // 1. E-Mail-Eindeutigkeit prüfen (wichtig für Bearbeiten und Erstellen)
  if (isEditing) {
    // Prüfe E-Mail nur, wenn sie geändert wurde
    if (email !== entity.email) {
      const existingUser = await Model.findOne({ email });
      if (existingUser) {
        throw new Error(
          "Diese E-Mail wird bereits von einem anderen Nutzer verwendet."
        );
      }
    }
  } else {
    // Beim Erstellen prüfen
    const existingUser = await Model.findOne({ email });
    if (existingUser) {
      throw new Error("Ein Nutzer mit dieser E-Mail existiert bereits.");
    }
  }

  // 2. Passwort-Hashing (nur wenn ein neues Passwort bereitgestellt wurde)
  if (password) {
    if (password.length < 6) {
      throw new Error("Das Passwort muss mindestens 6 Zeichen lang sein.");
    }
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(password, salt);
    entity.password = data.password; // Stellen Sie sicher, dass das gehashte Passwort im Entity-Objekt aktualisiert wird
  } else if (!isEditing) {
    // Beim Erstellen ist ein Passwort erforderlich
    throw new Error(
      "Passwort ist beim Erstellen eines neuen Nutzers erforderlich."
    );
  }

  // Wir synchronisieren die Daten von `data` auf `entity` im Hook,
  // um sicherzustellen, dass gehashte Passwörter übernommen werden.
  entity.username = data.username;
  entity.email = data.email;
  entity.role = data.role || "user";
};

// -------------------------------------------------------------------
// 🔥 Konfiguration für die User-Entität
// -------------------------------------------------------------------
const userConfig = {
  // 1. Model und Namen
  Model: User,
  entityName: "Nutzer",
  entityNamePlural: "Nutzer-Liste 🧑‍💻",

  // 2. Routen-Pfade
  listPath: "/user-list",
  modifyPath: "/modify-user",

  // 3. Wiederverwendbare Layout-Variablen
  createButton: "➕ Neuen Nutzer erstellen",

  // 4. Tabellen-Konfiguration
  tableHeaders: [
    { label: "Nutzername", key: "username", sortable: true },
    { label: "E-Mail", key: "email", sortable: true },
    { label: "Rolle", key: "role", sortable: true },
  ],

  // 5. Formular-Konfiguration (entspricht req.body Keys)
  formFields: [
    {
      label: "Nutzername",
      key: "username",
      type: "text",
      required: true,
      placeholder: "Max Mustermann",
    },
    {
      label: "E-Mail",
      key: "email",
      type: "email",
      required: true,
      placeholder: "max.mustermann@firma.de",
    },
    {
      label: "Passwort",
      key: "password",
      type: "password",
      required: false, // Optional beim Bearbeiten
      placeholder: "Leer lassen, um Passwort nicht zu ändern",
    },
    {
      label: "Rolle",
      key: "role",
      type: "select",
      defaultValue: "user",
      options: [
        { label: "User", value: "user" },
        { label: "Admin", value: "admin" },
        { label: "Moderator", value: "moderator" },
      ],
    },
  ],

  // 6. Hook für benutzerdefinierte Logik
  preSaveHook: userPreSaveHook,

  // 7. Erforderliche Hilfsfunktionen
  ensureAuthenticated,
  generateLayout,
};

// Router erstellen
const router = createCrudRouter(userConfig);

module.exports = router;
