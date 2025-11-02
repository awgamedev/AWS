exports.changeLanguage = (req, res) => {
  const newLocale = req.params.locale;

  if (req.setLocale) {
    req.setLocale(newLocale);

    req.logger.info(`Sprache erfolgreich auf ${req.getLocale()} umgestellt.`);

    res.cookie("lang", newLocale, { maxAge: 900000, httpOnly: true });

    const referrer = req.header("Referer") || "/";
    res.redirect(referrer);
  } else {
    res.status(500).send("i18n functionality is not available.");
  }
};
