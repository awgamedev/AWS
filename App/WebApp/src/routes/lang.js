// In your routes file (e.g. auth.js or a general routes.js)
const express = require("express");
const router = express.Router();

router.get("/changelang/:locale", (req, res) => {
  const newLocale = req.params.locale;

  if (req.setLocale) {
    req.setLocale(newLocale);

    const currentLocale = req.getLocale();
    req.logger.info(`Sprache erfolgreich auf ${currentLocale} umgestellt.`);

    res.cookie("lang", newLocale, { maxAge: 900000, httpOnly: true });

    const referrer = req.header("Referer") || "/";
    res.redirect(referrer);
  } else {
    res.status(500).send("i18n functionality is not available.");
  }
});

module.exports = router;
