const validateStampingData = async (req) => {
  const userId = req.user.id;
  const { stampingType, stampingReason } = req.body;

  const errors = {};

  if (!stampingType || !["in", "out"].includes(stampingType)) {
    errors.stampingType = req.__(
      "Ungültiger Stempeltyp. Erlaubt sind 'in' oder 'out'."
    );
  }

  if (stampingType === "in") {
    if (!stampingReason || !ALLOWED_REASONS.includes(stampingReason)) {
      errors.stampingReason = req.__(
        "Bitte wähle einen gültigen Stempelungsgrund aus."
      );
    }
  }

  const lastStamping = await Stamping.findOne({ userId })
    .sort({ date: -1 })
    .exec();

  if (
    stampingType === "in" &&
    lastStamping &&
    lastStamping.stampingType === "in"
  ) {
    errors.stampingReason = req.__(
      "Bitte wähle einen gültigen Stempelungsgrund aus."
    );
  }

  if (
    stampingType === "out" &&
    (!lastStamping || lastStamping.stampingType === "out")
  ) {
    errors.stampingReason = req.__(
      "Bitte wähle einen gültigen Stempelungsgrund aus."
    );
  }

  return errors;
};
