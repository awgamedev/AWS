const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
// generateLayout und die HTML-generierenden Helfer sind entfernt
const { ensureAuthenticated } = require("../middleware/auth");
const { genThItems } = require("../utils/table-components/tableItems");

// --- HILFSFUNKTIONEN ZUM EJS-RENDERING ---

/**
 * Rendert das Hauptlayout mit dem zuvor gerenderten Content-String.
 */
const renderWithLayout = (req, res, title, contentHtml, styles = "") => {
  // res.render() für das Layout, welches den contentHtml als bodyContent enthält
  res.render("layout", {
    title: title,
    styles: styles,
    bodyContent: contentHtml,
  });
};

/**
 * Rendert eine innere EJS-View und bettet sie in das Hauptlayout ein.
 * @param {object} req - Express Request Objekt
 * @param {object} res - Express Response Objekt
 * @param {string} viewName - Name der EJS-View (z.B. 'user_list', 'user_form')
 * @param {string} title - Seitentitel
 * @param {object} innerLocals - Variablen für die innere View
 * @param {string} specificStyles - Spezifische CSS-Styles (optional)
 * @param {number} statusCode - HTTP-Statuscode (optional)
 */
const renderView = (
  req,
  res,
  viewName,
  title,
  innerLocals = {},
  specificStyles = "",
  statusCode = 200
) => {
  res.status(statusCode);

  // Füge Standard-Locals hinzu, die in den Views benötigt werden (i18n, genThItems)
  const viewLocals = {
    ...innerLocals,
    __: req.__,
    genThItems: genThItems,
  };

  // 1. Innere View als String rendern
  req.app.render(viewName, viewLocals, (err, contentHtml) => {
    if (err) {
      req.logger.error(`Error rendering view ${viewName}:`, err);
      // Fallback: Einfaches Rendering der Fehlerseite (falls error_message.ejs fehlschlägt)
      const fallbackContent = `<div class="text-red-500 p-8"><h1>${
        req.__("ERROR_TITLE") || "Fehler"
      }</h1><p>${
        req.__("RENDER_ERROR") ||
        "Ein interner Rendering-Fehler ist aufgetreten."
      }</p></div>`;
      return renderWithLayout(
        req,
        res,
        req.__("ERROR_TITLE") || "Fehler",
        fallbackContent,
        ""
      );
    }

    // 2. Layout mit dem gerenderten Content rendern
    renderWithLayout(req, res, title, contentHtml, specificStyles);
  });
};

// --- ROUTEN ---

// 1. Liste anzeigen (GET /user-list)
router.get("/user-list", ensureAuthenticated, async (req, res) => {
  let items;
  const title = req.__("USER_LIST_PAGE_TITLE");

  try {
    items = await User.find({});
  } catch (err) {
    req.logger.error("Fehler beim Abrufen der Nutzer-Liste:", err);
    // Fehlerseite rendern
    return renderView(
      req,
      res,
      "error_message", // Nutzt die neue generische Fehlerseite
      req.__("ERROR_TITLE") || "Fehler",
      {
        message:
          req.__("USER_LIST_LOAD_ERROR") ||
          "Fehler beim Laden der Nutzer-Liste.",
      },
      "",
      500
    );
  }

  // View rendern
  renderView(req, res, "user_list", title, {
    // Konvertiere die Mongoose-Objekte, falls nötig, und übergebe sie
    items: items.map((item) => (item.toObject ? item.toObject() : item)),
  });
});

// 2a. FORMULAR ANZEIGEN: Neuen Nutzer erstellen (GET /create-user)
router.get("/create-user", ensureAuthenticated, (req, res) => {
  const title = req.__("CREATE_USER_PAGE_TITLE") || "Neuen Nutzer erstellen 📝";

  // View rendern
  renderView(req, res, "user_form", title, {
    entityToModify: {},
    isEditing: false,
  });
});

// 3a. AKTION: Neuen Nutzer speichern (POST /create-user)
router.post("/create-user", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  const { email, password } = data;
  const errorTitle = req.__("ERROR_TITLE") || "Fehler";

  try {
    // ... (Passwort- und E-Mail-Prüfungen bleiben gleich) ...
    if (!password) {
      throw new Error(
        req.__("ERROR_PASSWORD_REQUIRED") ||
          "Passwort ist beim Erstellen eines neuen Nutzers erforderlich."
      );
    }
    if (password.length < 6) {
      throw new Error(
        req.__("ERROR_PASSWORD_LENGTH") ||
          "Das Passwort muss mindestens 6 Zeichen lang sein."
      );
    }
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(password, salt);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error(
        req.__("ERROR_EMAIL_EXISTS") ||
          "Ein Nutzer mit dieser E-Mail existiert bereits."
      );
    }

    const newUser = new User(data);
    await newUser.save();
    res.redirect("/user-list");
  } catch (err) {
    req.logger.error("Fehler beim Erstellen des Nutzers:", err);
    // Fehlerseite rendern
    return renderView(
      req,
      res,
      "error_message",
      errorTitle,
      {
        message:
          err.message ||
          req.__("USER_CREATE_ERROR") ||
          `Fehler beim Erstellen des Nutzers.`,
      },
      "",
      500
    );
  }
});

// 2b. FORMULAR ANZEIGEN: Bestehenden Nutzer bearbeiten (GET /modify-user/:id)
router.get("/modify-user/:id", ensureAuthenticated, async (req, res) => {
  const itemId = req.params.id;
  const isEditing = true;
  const title = req.__("EDIT_USER_PAGE_TITLE");
  const errorTitle = req.__("ERROR_TITLE");
  let entityToModify = {};

  try {
    entityToModify = await User.findById(itemId);
    if (!entityToModify) {
      return renderView(
        req,
        res,
        "error_message",
        errorTitle,
        { message: req.__("USER_NOT_FOUND") || "Nutzer nicht gefunden." },
        "",
        404
      );
    }
  } catch (err) {
    req.logger.error("Fehler beim Abrufen der Nutzer-Daten:", err);
    return renderView(
      req,
      res,
      "error_message",
      errorTitle,
      {
        message:
          req.__("USER_DETAILS_LOAD_ERROR") ||
          "Fehler beim Laden der Nutzer-Details.",
      },
      "",
      500
    );
  }

  // View rendern
  renderView(req, res, "user_form", title, {
    entityToModify: entityToModify.toObject
      ? entityToModify.toObject()
      : entityToModify,
    isEditing: isEditing,
  });
});

// 3b. AKTION: Bestehenden Nutzer speichern (POST /modify-user)
router.post("/modify-user", ensureAuthenticated, async (req, res) => {
  const { id } = req.body;
  const data = req.body;
  const logger = req.logger;
  const errorTitle = req.__("ERROR_TITLE") || "Fehler";

  try {
    let entity = await User.findById(id);
    if (!entity) {
      return renderView(
        req,
        res,
        "error_message",
        errorTitle,
        { message: req.__("USER_NOT_FOUND") || "Nutzer nicht gefunden." },
        "",
        404
      );
    }

    const { email, password } = data;

    // E-Mail-Eindeutigkeit prüfen (nur wenn E-Mail geändert wurde)
    if (email !== entity.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error(
          req.__("ERROR_EMAIL_USED_BY_OTHER") ||
            "Diese E-Mail wird bereits von einem anderen Nutzer verwendet."
        );
      }
    }

    // Passwort-Hashing (nur wenn ein neues Passwort bereitgestellt wurde)
    if (password) {
      if (password.length < 6) {
        throw new Error(
          req.__("ERROR_PASSWORD_LENGTH") ||
            "Das Passwort muss mindestens 6 Zeichen lang sein."
        );
      }
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
      entity.password = data.password;
    } else {
      delete data.password;
    }

    // Daten aktualisieren
    entity.username = data.username;
    entity.email = data.email;
    entity.role = data.role || "user";

    await entity.save();
    res.redirect("/user-list");
  } catch (err) {
    logger.error("There was an error updating user:", err);
    // Fehlerseite rendern
    return renderView(
      req,
      res,
      "error_message",
      errorTitle,
      {
        message:
          err.message || req.__("USER_UPDATE_ERROR") || `Error updating user.`,
      },
      "",
      500
    );
  }
});

// 4. LÖSCHBESTÄTIGUNGSSEITE ANZEIGEN (GET /user-list/confirm-delete/:id)
router.get(
  "/user-list/confirm-delete/:id",
  ensureAuthenticated,
  async (req, res) => {
    const itemId = req.params.id;
    const title = req.__("CONFIRM_DELETE_PAGE_TITLE") || "Löschen bestätigen";
    const errorTitle = req.__("ERROR_TITLE") || "Fehler";
    let entityToDelete;

    try {
      entityToDelete = await User.findById(itemId);
      if (!entityToDelete) {
        return renderView(
          req,
          res,
          "error_message",
          errorTitle,
          { message: req.__("USER_NOT_FOUND") || "Nutzer nicht gefunden." },
          "",
          404
        );
      }
    } catch (err) {
      req.logger.error(
        "Fehler beim Abrufen der Nutzer-Daten für Löschung:",
        err
      );
      return renderView(
        req,
        res,
        "error_message",
        errorTitle,
        {
          message:
            req.__("USER_DELETE_DETAILS_ERROR") ||
            "Fehler beim Laden der Details.",
        },
        "",
        500
      );
    }

    // View rendern
    renderView(req, res, "user_delete_confirm", title, {
      entityToDelete: entityToDelete.toObject(),
    });
  }
);

// 5. ENDGÜLTIGE AKTION: ENTITÄT LÖSCHEN (POST /user-list/delete/:id)
router.post("/user-list/delete/:id", ensureAuthenticated, async (req, res) => {
  const itemId = req.params.id;
  const errorTitle = req.__("ERROR_TITLE") || "Fehler";

  try {
    const deletedItem = await User.findByIdAndDelete(itemId);
    if (deletedItem) {
      res.redirect("/user-list");
    } else {
      return renderView(
        req,
        res,
        "error_message",
        errorTitle,
        { message: req.__("USER_NOT_FOUND") || "Nutzer nicht gefunden." },
        "",
        404
      );
    }
  } catch (err) {
    req.logger.error("Fehler beim Löschen des Nutzers:", err);
    return renderView(
      req,
      res,
      "error_message",
      errorTitle,
      {
        message:
          req.__("USER_DELETE_ERROR") || "Fehler beim Löschen des Nutzers.",
      },
      "",
      500
    );
  }
});

module.exports = router;
