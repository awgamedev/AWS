const express = require("express");
const router = express.Router();
const Stamping = require("./stamping.model");
const { ensureAuthenticated, checkRole } = require("../../middleware/auth");
const {
  validateStampingData,
  validateStampingPairEdit,
} = require("./stamping.validator");
const { ALLOWED_STAMPING_REASONS } = require("./stamping.constants");

/**
 * POST /api/stampings/pair
 * Create a new stamping pair (admin only)
 */
router.post(
  "/api/stampings/pair",
  ensureAuthenticated,
  checkRole("admin"),
  async (req, res) => {
    try {
      const { userId, reason, date, inTime, outTime } = req.body;

      // Validate the pair data
      const validationReq = {
        body: { reason, date, inTime, outTime },
        __: req.__,
      };

      const validationErrors = await validateStampingPairEdit(
        validationReq,
        ALLOWED_STAMPING_REASONS
      );

      if (Object.keys(validationErrors).length > 0) {
        return res
          .status(400)
          .json({ msg: "Ungültige Stempeldaten.", errors: validationErrors });
      }

      // Parse date and times as local time
      const [year, month, day] = date.split("-").map(Number);
      const [inHour, inMinute] = inTime.split(":").map(Number);
      const inDateTime = new Date(year, month - 1, day, inHour, inMinute, 0);

      // Create the "in" stamping
      const newIn = new Stamping({
        userId,
        stampingType: "in",
        stampingReason: reason,
        date: inDateTime,
      });

      const inStamping = await newIn.save();

      // Create the "out" stamping if outTime is provided
      let outStamping = null;
      if (outTime) {
        const [outHour, outMinute] = outTime.split(":").map(Number);
        const outDateTime = new Date(
          year,
          month - 1,
          day,
          outHour,
          outMinute,
          0
        );

        const newOut = new Stamping({
          userId,
          stampingType: "out",
          date: outDateTime,
        });
        outStamping = await newOut.save();
      }

      res.status(201).json({
        msg: `Stempelpaar erfolgreich erstellt.`,
        stampings: { in: inStamping, out: outStamping },
      });
    } catch (err) {
      console.error("Fehler beim Erstellen des Stempelpaars:", err.message);
      res
        .status(500)
        .json({ msg: "Serverfehler beim Erstellen des Stempelpaars." });
    }
  }
);

/**
 * POST /api/stampings
 * Create a new stamping entry (admin only)
 * @deprecated Use POST /api/stampings/pair instead
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
 * PUT /api/stampings/pair
 * Update a stamping pair (both in and out entries) (admin only)
 */
router.put(
  "/api/stampings/pair",
  ensureAuthenticated,
  checkRole("admin"),
  async (req, res) => {
    try {
      const { inId, outId, reason, date, inTime, outTime } = req.body;

      // Validate the pair edit
      const validationErrors = await validateStampingPairEdit(
        req,
        ALLOWED_STAMPING_REASONS
      );

      if (Object.keys(validationErrors).length > 0) {
        return res
          .status(400)
          .json({ msg: "Ungültige Stempeldaten.", errors: validationErrors });
      }

      // Parse date and times as local time
      const [year, month, day] = date.split("-").map(Number);
      const [inHour, inMinute] = inTime.split(":").map(Number);
      const inDateTime = new Date(year, month - 1, day, inHour, inMinute, 0);

      // Update the "in" stamping
      if (!inId) {
        return res.status(400).json({ msg: "In-Stempelungs-ID fehlt." });
      }

      const updatedIn = await Stamping.findByIdAndUpdate(
        inId,
        {
          date: inDateTime,
          stampingReason: reason,
        },
        { new: true }
      );

      if (!updatedIn) {
        return res.status(404).json({ msg: "Einstempelung nicht gefunden." });
      }

      // Update or create the "out" stamping if outTime is provided
      let updatedOut = null;
      if (outTime) {
        const [outHour, outMinute] = outTime.split(":").map(Number);
        const outDateTime = new Date(
          year,
          month - 1,
          day,
          outHour,
          outMinute,
          0
        );

        if (outId && outId !== "null" && outId !== "") {
          // Update existing out stamping
          updatedOut = await Stamping.findByIdAndUpdate(
            outId,
            { date: outDateTime },
            { new: true }
          );
        } else {
          // Create new out stamping
          const newOut = new Stamping({
            userId: updatedIn.userId,
            stampingType: "out",
            date: outDateTime,
          });
          updatedOut = await newOut.save();
        }
      } else if (outId && outId !== "null" && outId !== "") {
        // If outTime is empty but outId exists, delete the out stamping
        await Stamping.findByIdAndDelete(outId);
      }

      res.status(200).json({
        msg: "Stempelpaar erfolgreich aktualisiert.",
        stampings: { in: updatedIn, out: updatedOut },
      });
    } catch (err) {
      console.error("Fehler beim Aktualisieren der Stempelung:", err.message);
      res
        .status(500)
        .json({ msg: "Serverfehler beim Aktualisieren der Stempelung." });
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
