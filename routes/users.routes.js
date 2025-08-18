// routes/users.routes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const auth = require("../middleware/auth");
const { registerRules, runValidation } = require("../middleware/validate");

const router = express.Router();

// POST /api/users/register
router.post("/register", registerRules, runValidation, async (req, res, next) => {
  try {
    const { name, email, password, mobile, city, role } = req.body;

    // is email taken?
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // create user
    const user = await User.create({
      name,
      email,
      password: hashed,
      mobile,
      city,
      role,
    });

    // sign token
    const token = signToken({ id: user._id, role: user.role });

    // respond
    return res.status(201).json({
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me  (simple protected route to test token)
router.get("/me", auth, async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });
    res.json({ user: me.toJSON() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
