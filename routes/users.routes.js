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

// PATCH /api/users/change-password
// Verifies current password then replaces it with the new one
router.patch("/change-password", auth, async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Both current and new password are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }

  try {
    // Fetch user — password is available on raw document (toJSON strips it, not the DB query)
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Compare current password against stored hash
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me
// Permanently deletes the user account
router.delete("/me", auth, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
