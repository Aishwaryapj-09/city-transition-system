const { body } = require('express-validator');

exports.validateListing = [
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('location').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
  body('type').isIn(['PG', 'House', 'Hostel'])
];