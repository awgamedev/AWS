const express = require("express");
const router = express.Router();
const langController = require("./lang.controller");

router.get("/changelang/:locale", langController.changeLanguage);

module.exports = router;
