const languageHelperService = require("../services/languageHelper.service");

exports.getLanguageHelper = async (req, res) => {
  try {
    const result = await languageHelperService.resolveLanguageHelper({
      place: req.query.place,
      lat: req.query.lat,
      lng: req.query.lng
    });

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      message: statusCode === 500 ? "Server error while loading local language helper" : error.message
    });
  }
};

exports.translateLanguageHelperText = async (req, res) => {
  try {
    const result = await languageHelperService.translateEnglishText({
      place: req.body.place,
      text: req.body.text
    });

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      message: statusCode === 500 ? "Server error while translating text" : error.message
    });
  }
};
