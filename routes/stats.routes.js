// routes/stats.routes.js
// All three developer dashboard stat cards are powered from here.
// Single responsibility: aggregate numbers for the logged-in user.

const express    = require("express");
const router     = express.Router();
const auth       = require("../middleware/auth");
const JobListing = require("../models/JobListing");
const Project    = require("../models/Project");

/**
 * @route   GET /api/stats/developer
 * @desc    Return all three stat card values in one request
 *          - appliedJobs  : how many job listings this user has applied to
 *          - totalEarnings: sum of budget for all Completed projects
 *          - activeProjects: count of Active projects
 * @access  Private (freelancer)
 *
 * Why one combined endpoint instead of three separate ones?
 * Each card needs a different DB query. Combining them means ONE network
 * round-trip from the frontend instead of three. This is called an
 * "aggregation endpoint" — common in production dashboards.
 */
router.get("/developer", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Run all three DB queries in parallel — Promise.all means they execute
    // simultaneously, not one after another. Total time = slowest query, not sum.
    const [appliedCount, earningsResult, activeCount] = await Promise.all([

      // 1. Count job listings where this user's ID is in the applicants array
      JobListing.countDocuments({ applicants: userId }),

      // 2. Sum the budget of all Completed projects for this developer
      //    MongoDB aggregation pipeline:
      //    $match  → filter to this developer's completed projects
      //    $group  → group all results into one doc, sum the budget field
      Project.aggregate([
        { $match: { developer: require("mongoose").Types.ObjectId.createFromHexString(userId), status: "Completed" } },
        { $group: { _id: null, total: { $sum: "$budget" } } },
      ]),

      // 3. Count Active projects for this developer
      Project.countDocuments({ developer: userId, status: "Active" }),
    ]);

    // earningsResult is an array from aggregate — it's empty if no completed projects
    const totalEarnings = earningsResult.length > 0 ? earningsResult[0].total : 0;

    res.json({
      appliedJobs:     appliedCount,
      totalEarnings,
      activeProjects:  activeCount,
    });
  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * @route   GET /api/stats/recruiter
 * @desc    Recruiter dashboard stats
 *          - activeListings : open job listings posted by this client
 *          - totalApplicants: total applicants across all their listings
 *          - totalPosted    : total jobs ever posted
 * @access  Private (client)
 */
router.get("/recruiter", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [activeListings, allListings, totalPosted] = await Promise.all([
      // Open listings by this recruiter
      JobListing.countDocuments({ postedBy: userId, status: "Open" }),

      // All listings — we need to sum applicant counts
      JobListing.find({ postedBy: userId }).select("applicants"),

      // Total ever posted
      JobListing.countDocuments({ postedBy: userId }),
    ]);

    // Sum up applicants across all listings
    const totalApplicants = allListings.reduce(
      (sum, listing) => sum + listing.applicants.length,
      0
    );

    res.json({
      activeListings,
      totalApplicants,
      totalPosted,
    });
  } catch (err) {
    console.error("Recruiter stats error:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
