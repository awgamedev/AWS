// Routes für Account-spezifische Aktionen (z.B. Geräteverwaltung)
// Pfad: /account/...

const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../../middleware/auth");
const User = require("../user/user.model");

// Vergisst alle Geräte (alle Refresh Tokens) des aktuell eingeloggten Benutzers
router.post(
  "/account/forget-devices",
  ensureAuthenticated,
  async (req, res) => {
    try {
      req.user.refreshTokens = [];
      await req.user.save();
      // Cookies leeren (Access & Refresh), Session invalidieren optional
      res.clearCookie("auth_token");
      res.clearCookie("refresh_token");
      req.logout(() => {
        // Weiterleitung zum Login mit Hinweis
        res.redirect(
          "/login?success=" +
            encodeURIComponent("Alle Geräte wurden abgemeldet.")
        );
      });
    } catch (err) {
      console.error("Fehler beim Vergessen der Geräte:", err);
      res.status(500).send("Interner Fehler beim Entfernen der Geräte.");
    }
  }
);

module.exports = router;
