// utils/jwt.js
const jwt = require("jsonwebtoken");

function signToken(payload) {
  // token valid for 1 day; tweak as needed
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
}

module.exports = { signToken };
