// routes/auth.routes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const { loginRules, runValidation } = require("../middleware/validate");

const router = express.Router();

// POST /api/auth/login
router.post("/login", loginRules, runValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // verify password
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    // sign token
    const token = signToken({ id: user._id, role: user.role });

    res.json({
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
