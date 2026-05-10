const languageHelperService = require("../services/languageHelper.service");

exports.getLanguageHelper = (req, res) => {
  try {
    const result = languageHelperService.resolveLanguageHelper(req.query.place);

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      message: statusCode === 500 ? "Server error while loading local language helper" : error.message
    });
  }
};
