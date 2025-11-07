const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
// generateLayout, genThItems, und die HTML-generierenden Funktionen sind NICHT mehr notwendig
// const generateLayout = require("../utils/layout"); // Entfernt
const { ensureAuthenticated } = require("../middleware/auth");
// const { genThItems } = require("../utils/table-components/tableItems"); // Entfernt

// Die HTML-generierenden Funktionen (renderUserListContent etc.) sind nun EJS-Dateien und werden entfernt.

// 1. Liste anzeigen (GET /user-list)
router.get("/user-list", ensureAuthenticated, async (req, res) => {
  let items;
  try {
    items = await User.find({});
  } catch (err) {
    console.error("Fehler beim Abrufen der Nutzer-Liste:", err);
    // HINWEIS: Hier müssten Sie eine EJS-Fehlerseite rendern.
    // Wenn generateLayout ein Full-Page-Wrapper ist, ersetzen Sie es durch res.render('layout', { title: 'Fehler', content: '...' })
    return res.status(500).render("error", {
      // Annahme: Sie haben ein 'error.ejs'-Template
      title: "Fehler",
      errorMessage: "Fehler beim Laden der Nutzer-Liste.",
    });
  }

  // **NEU:** Rendert das user-list.ejs-Template und übergibt die Daten
  res.render("user-list", {
    title: "Nutzer-Liste 🧑‍💻",
    items: items, // Übergibt die Liste der Nutzer an das EJS-Template
    // reqPath, req.user werden idealerweise über ein globales Layout-Template verfügbar gemacht
  });
});

// 2a. FORMULAR ANZEIGEN: Neuen Nutzer erstellen (GET /create-user)
router.get("/create-user", ensureAuthenticated, (req, res) => {
  // **NEU:** Rendert das modify-user.ejs-Template und übergibt die Daten
  res.render("modify-user", {
    title: "Neuen Nutzer erstellen 📝",
    isEditing: false,
    user: { username: "", email: "", role: "user" }, // Leeres Objekt für die View
    formAction: "/create-user",
  });
});

// 3a. AKTION: Neuen Nutzer speichern (POST /create-user)
// Logik bleibt unverändert, da sie keine HTML-Ausgabe generiert.
router.post("/create-user", ensureAuthenticated, async (req, res) => {
  // ... Logik zum Speichern und Fehlerbehandlung (wie zuvor) ...
  // Bei Erfolg:
  try {
    // ... (Ihre Erstellungs- und Hash-Logik) ...
    res.redirect("/user-list");
  } catch (err) {
    console.error("Fehler beim Erstellen des Nutzers:", err);
    // Fehlerbehandlung sollte auf ein Fehler-Template umgestellt werden
    return res.status(500).render("error", {
      title: "Fehler",
      errorMessage: err.message || `Fehler beim Erstellen des Nutzers.`,
    });
  }
});

// 2b. FORMULAR ANZEIGEN: Bestehenden Nutzer bearbeiten (GET /modify-user/:id)
router.get("/modify-user/:id", ensureAuthenticated, async (req, res) => {
  const itemId = req.params.id;
  let entityToModify = {};

  try {
    entityToModify = await User.findById(itemId);
    if (!entityToModify) {
      return res.status(404).render("error", {
        title: "Fehler",
        errorMessage: "Nutzer nicht gefunden.",
      });
    }
  } catch (err) {
    console.error("Fehler beim Abrufen der Nutzer-Daten:", err);
    return res.status(500).render("error", {
      title: "Fehler",
      errorMessage: "Fehler beim Laden der Nutzer-Details.",
    });
  }

  // **NEU:** Rendert das modify-user.ejs-Template
  res.render("modify-user", {
    title: "Nutzer bearbeiten ✍️",
    isEditing: true,
    user: entityToModify.toObject(), // Übergibt die geladenen Daten
    formAction: "/modify-user",
  });
});

// 3b. AKTION: Bestehenden Nutzer speichern (POST /modify-user)
// Logik bleibt unverändert.
router.post("/modify-user", ensureAuthenticated, async (req, res) => {
  // ... Logik zur Aktualisierung und Fehlerbehandlung (wie zuvor) ...
  // Bei Erfolg:
  try {
    // ... (Ihre Aktualisierungs-Logik) ...
    res.redirect("/user-list");
  } catch (err) {
    console.error("Fehler beim Speichern des Nutzers:", err);
    // Fehlerbehandlung auf Template umstellen
    return res.status(500).render("error", {
      title: "Fehler",
      errorMessage: err.message || `Fehler beim Aktualisieren des Nutzers.`,
    });
  }
});

// 4. LÖSCHBESTÄTIGUNGSSEITE ANZEIGEN (GET /user-list/confirm-delete/:id)
router.get(
  "/user-list/confirm-delete/:id",
  ensureAuthenticated,
  async (req, res) => {
    const itemId = req.params.id;
    let entityToDelete;

    try {
      entityToDelete = await User.findById(itemId);
      if (!entityToDelete) {
        return res.status(404).render("error", {
          title: "Fehler",
          errorMessage: "Nutzer nicht gefunden.",
        });
      }
    } catch (err) {
      console.error("Fehler beim Abrufen der Nutzer-Daten für Löschung:", err);
      return res.status(500).render("error", {
        title: "Fehler",
        errorMessage: "Fehler beim Laden der Details.",
      });
    }

    // **NEU:** Rendert das confirm-delete.ejs-Template
    res.render("confirm-delete", {
      title: "Löschen bestätigen",
      user: entityToDelete.toObject(), // Übergibt die Nutzerdaten zur Anzeige
    });
  }
);

// 5. ENDGÜLTIGE AKTION: ENTITÄT LÖSCHEN (POST /user-list/delete/:id)
// Logik bleibt unverändert.
router.post("/user-list/delete/:id", ensureAuthenticated, async (req, res) => {
  // ... Logik zum Löschen und Fehlerbehandlung (wie zuvor) ...
  // Bei Erfolg:
  try {
    // ... (Ihre Lösch-Logik) ...
    res.redirect("/user-list");
  } catch (err) {
    console.error("Fehler beim Löschen des Nutzers:", err);
    return res.status(500).render("error", {
      title: "Fehler",
      errorMessage: "Fehler beim Löschen des Nutzers.",
    });
  }
});

module.exports = router;
