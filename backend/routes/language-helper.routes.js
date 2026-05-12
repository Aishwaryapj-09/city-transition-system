const express = require("express");

const router = express.Router();
const languageHelperController = require("../controllers/languageHelper.controller");

router.get("/", languageHelperController.getLanguageHelper);
router.post("/translate", languageHelperController.translateLanguageHelperText);

module.exports = router;
