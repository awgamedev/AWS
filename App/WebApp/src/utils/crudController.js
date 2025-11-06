// src/utils/crudController.js

const express = require("express");
const {
  renderList,
  renderModifyForm,
  renderConfirmDelete,
} = require("./crudView");

// Hinweis: generateLayout und ensureAuthenticated müssen in der Datei, die diesen Controller nutzt,
// importiert und dem Factory-Funktionsaufruf übergeben werden.

/**
 * Erstellt einen wiederverwendbaren Express-Router für CRUD-Operationen.
 * * @param {object} options - Konfigurationsobjekt
 * @param {object} options.Model - Das Mongoose-Model (z.B. User, Product)
 * @param {string} options.entityName - Singular-Name (z.B. "Nutzer")
 * @param {string} options.entityNamePlural - Plural-Name (z.B. "Nutzer-Liste")
 * @param {string} options.listPath - Pfad zur Liste (z.B. "/user-list")
 * @param {string} options.modifyPath - Pfad zum Bearbeiten/Erstellen (z.B. "/modify-user")
 * @param {string} options.createButton - Text für den Erstellen-Button (z.B. "➕ Neuen Nutzer erstellen")
 * @param {Array<object>} options.tableHeaders - Array von Spalten-Definitionen für die Liste
 * @param {Array<object>} options.formFields - Array von Feld-Definitionen für das Formular
 * @param {function} options.preSaveHook - OPTIONAL: Funktion zur Durchführung entity-spezifischer Logik vor dem Speichern (z.B. Passworthashing)
 * @param {function} options.ensureAuthenticated - Die Middleware zur Authentifizierungsprüfung
 * @param {function} options.generateLayout - Die Funktion zur Erzeugung des Gesamtlayouts
 * @returns {express.Router} Ein konfigurierter Express Router
 */
module.exports = function createCrudRouter({
  Model,
  entityName,
  entityNamePlural,
  listPath,
  modifyPath,
  createButton,
  tableHeaders,
  formFields,
  preSaveHook,
  ensureAuthenticated,
  generateLayout,
}) {
  const router = express.Router();

  const config = {
    Model,
    entityName,
    entityNamePlural,
    listPath,
    modifyPath,
    createButton,
    tableHeaders,
    formFields,
  };

  // -------------------------------------------------------------------
  // 1. Liste anzeigen (GET /listPath)
  // -------------------------------------------------------------------
  router.get(listPath, ensureAuthenticated, async (req, res) => {
    let items;
    try {
      items = await Model.find({});
    } catch (err) {
      console.error(`Fehler beim Abrufen der ${entityNamePlural}:`, err);
      return res
        .status(500)
        .send(
          generateLayout(
            "Fehler",
            `Fehler beim Laden der ${entityNamePlural}.`,
            req.path
          )
        );
    }

    const content = renderList({ config, items });
    res.send(generateLayout(entityNamePlural, content, req.path));
  });

  // -------------------------------------------------------------------
  // 2. BEARBEITEN/ERSTELLEN ANZEIGEN (GET /modifyPath/:id? oder /modifyPath)
  // -------------------------------------------------------------------

  // Funktion, die die gesamte Logik für das Anzeigen des Formulars enthält
  async function handleModifyGet(req, res) {
    const itemId = req.params.id;
    let entityToModify = {};
    const isEditing = !!itemId;

    const title = isEditing
      ? `${entityName} bearbeiten ✍️`
      : `Neuen ${entityName} erstellen 📝`;

    if (isEditing) {
      try {
        entityToModify = await Model.findById(itemId);
        if (!entityToModify) {
          return res
            .status(404)
            .send(
              generateLayout(
                "Fehler",
                `${entityName} nicht gefunden.`,
                req.path
              )
            );
        }
      } catch (err) {
        console.error(`Fehler beim Abrufen der ${entityName}-Daten:`, err);
        return res
          .status(500)
          .send(
            generateLayout(
              "Fehler",
              `Fehler beim Laden der ${entityName}-Details.`,
              req.path
            )
          );
      }
    }

    const formContent = renderModifyForm({
      config,
      entityToModify: entityToModify.toObject(),
      isEditing,
    });
    res.send(generateLayout(title, formContent, req.path));
  }

  // Routen für Bearbeiten (mit ID) und Erstellen (ohne ID)
  router.get(`${modifyPath}/:id`, ensureAuthenticated, handleModifyGet);
  router.get(modifyPath, ensureAuthenticated, handleModifyGet);

  // -------------------------------------------------------------------
  // 3. ENTITÄT ERSTELLEN/SPEICHERN (POST /modifyPath)
  // -------------------------------------------------------------------
  router.post(modifyPath, ensureAuthenticated, async (req, res) => {
    const { id } = req.body;
    const isEditing = !!id;
    const data = req.body;

    try {
      // --- 1. Bearbeiten eines bestehenden Elements ---
      if (isEditing) {
        let entity = await Model.findById(id);
        if (!entity) {
          return res
            .status(404)
            .send(
              generateLayout(
                "Fehler",
                `${entityName} nicht gefunden.`,
                req.path
              )
            );
        }

        // Entity-spezifische Logik (z.B. Passworthashing, E-Mail-Check) ausführen
        if (preSaveHook) {
          await preSaveHook({ data, entity, Model, isEditing });
        }

        // Daten aktualisieren
        Object.assign(entity, data);
        await entity.save();
        res.redirect(listPath);

        // --- 2. Erstellen eines neuen Elements ---
      } else {
        let newEntity = new Model(data);

        // Entity-spezifische Logik (z.B. Passworthashing, E-Mail-Check) ausführen
        if (preSaveHook) {
          await preSaveHook({ data, entity: newEntity, Model, isEditing });
        }

        await newEntity.save();
        res.redirect(listPath);
      }
    } catch (err) {
      console.error(`Fehler beim Speichern des ${entityName}:`, err);
      // Verbesserte Fehlerbehandlung für Validierungsfehler
      const errorMsg =
        err.name === "ValidationError"
          ? `Validierungsfehler: ${Object.values(err.errors)
              .map((e) => e.message)
              .join(", ")}`
          : `Fehler beim Speichern des ${entityName}.`;

      return res.status(500).send(generateLayout("Fehler", errorMsg, req.path));
    }
  });

  // -------------------------------------------------------------------
  // 4. LÖSCHBESTÄTIGUNGSSEITE ANZEIGEN (GET /listPath/confirm-delete/:id)
  // -------------------------------------------------------------------
  router.get(
    `${listPath}/confirm-delete/:id`,
    ensureAuthenticated,
    async (req, res) => {
      const itemId = req.params.id;
      let entityToDelete;

      try {
        entityToDelete = await Model.findById(itemId);
        if (!entityToDelete) {
          return res
            .status(404)
            .send(
              generateLayout(
                "Fehler",
                `${entityName} nicht gefunden.`,
                req.path
              )
            );
        }
      } catch (err) {
        console.error(`Fehler beim Abrufen der ${entityName}-Daten:`, err);
        return res
          .status(500)
          .send(
            generateLayout("Fehler", "Fehler beim Laden der Details.", req.path)
          );
      }

      const content = renderConfirmDelete({
        config,
        entityToDelete: entityToDelete.toObject(),
      });
      res.send(generateLayout("Löschen bestätigen", content, req.path));
    }
  );

  // -------------------------------------------------------------------
  // 5. ENDGÜLTIGE AKTION: ENTITÄT LÖSCHEN (POST /listPath/delete/:id)
  // -------------------------------------------------------------------
  router.post(
    `${listPath}/delete/:id`,
    ensureAuthenticated,
    async (req, res) => {
      const itemId = req.params.id;
      try {
        const deletedItem = await Model.findByIdAndDelete(itemId);
        if (deletedItem) {
          res.redirect(listPath);
        } else {
          res
            .status(404)
            .send(
              generateLayout(
                "Fehler",
                `${entityName} nicht gefunden.`,
                req.path
              )
            );
        }
      } catch (err) {
        console.error(`Fehler beim Löschen des ${entityName}:`, err);
        return res
          .status(500)
          .send(
            generateLayout(
              "Fehler",
              `Fehler beim Löschen des ${entityName}.`,
              req.path
            )
          );
      }
    }
  );

  return router;
};
