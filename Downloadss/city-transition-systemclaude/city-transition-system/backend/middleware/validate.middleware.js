const { query, validationResult } = require("express-validator");

const validateAccommodationQuery = [
  query("lat").optional().isFloat(),
  query("lng").optional().isFloat(),
  query("minRent").optional().isNumeric(),
  query("maxRent").optional().isNumeric(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = validateAccommodationQuery;