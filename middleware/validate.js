// middleware/validate.js
const { body, validationResult } = require("express-validator");

// validators
const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("mobile")
    .matches(/^[0-9]{10}$/)
    .withMessage("Mobile must be 10 digits"),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("role")
    .isIn(["freelancer", "client"])
    .withMessage("Invalid role"),
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

// single runner
function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // return first error for simplicity
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
}

module.exports = { registerRules, loginRules, runValidation };
