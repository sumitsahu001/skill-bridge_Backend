const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Profile = require("../models/Profile");

// @route   GET /api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate("user", ["name", "email", "mobile", "city"]);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/profile
// @desc    Create or update user profile
// @access  Private
router.post("/", auth, async (req, res) => {
  const {
    title,
    bio,
    skills,
    experience,
    education,
    portfolio,
    hourlyRate,
  } = req.body;

  // Build profile object
  const profileFields = {};
  profileFields.user = req.user.id;
  if (title) profileFields.title = title;
  if (bio) profileFields.bio = bio;
  if (hourlyRate) profileFields.hourlyRate = hourlyRate;
  if (skills) {
    profileFields.skills = Array.isArray(skills) ? skills : skills.split(",").map((skill) => skill.trim());
  }

  // Build portfolio object
  profileFields.portfolio = {};
  if (portfolio?.github) profileFields.portfolio.github = portfolio.github;
  if (portfolio?.linkedin) profileFields.portfolio.linkedin = portfolio.linkedin;
  if (portfolio?.website) profileFields.portfolio.website = portfolio.website;

  if (experience) profileFields.experience = experience;
  if (education) profileFields.education = education;

  profileFields.isCompleted = true; // Mark as completed if they submit

  try {
    let profile = await Profile.findOne({ user: req.user.id });

    if (profile) {
      // Update
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true }
      );
      return res.json(profile);
    }

    // Create
    profile = new Profile(profileFields);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/profile/:userId
// @desc    Get profile by user ID
// @access  Public
router.get("/user/:userId", async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.userId }).populate("user", ["name", "email", "city"]);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if (err.kind == "ObjectId") {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.status(500).send("Server Error");
  }
});

module.exports = router;
