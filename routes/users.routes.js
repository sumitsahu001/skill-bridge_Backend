// routes/users.routes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Profile = require("../models/Profile");
const Project = require("../models/Project");
const JobListing = require("../models/JobListing");
const Activity = require("../models/Activity");
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

    // log activity
    await Activity.create({
      user: user._id,
      userName: user.name,
      action: 'USER_REGISTERED',
      target: user.role
    });

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

    // Ensure new password is not the same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password cannot be the same as the current password" });
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
// Permanently deletes the user account and all associated data
router.delete("/me", auth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Delete Profile
    await Profile.findOneAndDelete({ user: userId });

    // 2. Delete Projects where user is the developer
    await Project.deleteMany({ developer: userId });

    // 3. Delete Job Listings posted by the user
    await JobListing.deleteMany({ postedBy: userId });

    // 4. Remove user from applicants list in all job listings
    await JobListing.updateMany(
      { applicants: userId },
      { $pull: { applicants: userId } }
    );

    // 5. Log activity (before user is gone)
    const me = await User.findById(userId);
    await Activity.create({
      user: userId,
      userName: me ? me.name : 'Unknown',
      action: 'ACCOUNT_DELETED',
      target: me ? me.email : ''
    });

    // 6. Finally, delete the User
    await User.findByIdAndDelete(userId);

    res.json({ message: "Account and all associated data deleted successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
