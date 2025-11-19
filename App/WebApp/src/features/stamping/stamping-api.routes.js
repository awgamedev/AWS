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

      // Validate stamping data - create a modified req object with the target userId
      const validationReq = {
        body: { stampingType, stampingReason },
        user: { id: userId },
        __: req.__,
      };

      const validationErrors = await validateStampingData(
        validationReq,
        ALLOWED_STAMPING_REASONS,
        true // Skip sequence check for admin-created entries
      );

      if (Object.keys(validationErrors).length > 0) {
        return res
          .status(400)
          .json({ msg: "Ungültige Stempeldaten.", errors: validationErrors });
      }

      // Parse date string as local time (format: YYYY-MM-DDTHH:mm:ss)
      // Split the datetime string and create a Date object with local timezone
      const [datePart, timePart] = date.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute, second = 0] = timePart.split(":").map(Number);
      const localDate = new Date(year, month - 1, day, hour, minute, second);

      // Create new stamping
      const newStamping = new Stamping({
        userId,
        stampingType,
        stampingReason: stampingType === "in" ? stampingReason : undefined,
        date: localDate,
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
