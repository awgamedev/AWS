const express = require("express");
const router = express.Router();
const Stamping = require("./stamping.model");
const { ensureAuthenticated, checkRole } = require("../../middleware/auth");
const { validateStampingData } = require("./stamping.validator");
const { ALLOWED_STAMPING_REASONS } = require("./stamping.constants");

/**
 * POST /api/stampings
 * Create a new stamping entry (admin only)
 */
router.post(
  "/api/stampings",
  ensureAuthenticated,
  checkRole("admin"),
  async (req, res) => {
    try {
      const { userId, stampingType, stampingReason, date } = req.body;

      // Validate stamping data
      const validationErrors = await validateStampingData(
        { body: { stampingType, stampingReason }, user: { id: userId } },
        ALLOWED_STAMPING_REASONS
      );

      if (Object.keys(validationErrors).length > 0) {
        return res
          .status(400)
          .json({ msg: "Ungültige Stempeldaten.", errors: validationErrors });
      }

      // Create new stamping
      const newStamping = new Stamping({
        userId,
        stampingType,
        stampingReason: stampingType === "in" ? stampingReason : undefined,
        date: new Date(date),
      });

      const stampingEntry = await newStamping.save();

      res.status(201).json({
        msg: `Stempelung erfolgreich erstellt.`,
        stamping: stampingEntry.toObject(),
      });
    } catch (err) {
      console.error("Fehler beim Erstellen der Stempelung:", err.message);
      res
        .status(500)
        .json({ msg: "Serverfehler beim Erstellen der Stempelung." });
    }
  }
);

/**
 * DELETE /api/stampings/:id
 * Delete a stamping entry by ID (admin only)
 */
router.delete(
  "/api/stampings/:id",
  ensureAuthenticated,
  checkRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const deletedStamping = await Stamping.findByIdAndDelete(id);

      if (!deletedStamping) {
        return res.status(404).json({ msg: "Stempelung nicht gefunden." });
      }

      res.status(200).json({
        msg: "Stempelung erfolgreich gelöscht.",
        stamping: deletedStamping.toObject(),
      });
    } catch (err) {
      console.error("Fehler beim Löschen der Stempelung:", err.message);
      res
        .status(500)
        .json({ msg: "Serverfehler beim Löschen der Stempelung." });
    }
  }
);

module.exports = router;
