const express = require("express");
const router = express.Router();
const langController = require("../controllers/langController"); // Import Controller

router.get("/changelang/:locale", langController.changeLanguage);

module.exports = router;
