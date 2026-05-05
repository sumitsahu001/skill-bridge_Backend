// routes/jobListing.routes.js
const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const JobListing = require("../models/JobListing");

// ─── Validation rules ────────────────────────────────────────────────────────

const listingRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("company").trim().notEmpty().withMessage("Company name is required"),
  body("budget")
    .isFloat({ min: 1 })
    .withMessage("Budget must be a positive number"),
  body("budgetType")
    .isIn(["Fixed", "Hourly"])
    .withMessage("Budget type must be Fixed or Hourly"),
  body("skills")
    .isArray({ min: 1 })
    .withMessage("At least one skill is required"),
  body("location")
    .isIn(["Remote", "Hybrid", "On-site"])
    .withMessage("Location must be Remote, Hybrid, or On-site"),
  body("deadline").isISO8601().withMessage("Valid deadline date is required"),
];

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/jobs
 * @desc    Get all open job listings (with optional search + filters)
 * @access  Public
 *
 * Query params:
 *   search   - text search across title, description, company
 *   location - "Remote" | "Hybrid" | "On-site"
 *   type     - "Fixed" | "Hourly"
 *   page     - page number (default: 1)
 *   limit    - results per page (default: 10)
 */
router.get("/", async (req, res) => {
  try {
    const { search, location, type, page = 1, limit = 10 } = req.query;

    // Build the filter object dynamically
    const filter = { status: "Open" };

    // Full-text search (uses the text index we defined on the model)
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    if (location) filter.location = location;
    if (type) filter.budgetType = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [listings, total] = await Promise.all([
      JobListing.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-applicants"), // don't expose applicant IDs to public
      JobListing.countDocuments(filter),
    ]);

    res.json({
      listings,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get a single job listing by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const listing = await JobListing.findById(req.params.id)
      .populate("postedBy", "name email")
      .populate("applicants", "name email city");

    if (!listing) {
      return res.status(404).json({ message: "Job listing not found" });
    }

    res.json(listing);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * @route   POST /api/jobs
 * @desc    Create a new job listing
 * @access  Private — client role only
 */
router.post(
  "/",
  auth,
  requireRole("client"),
  listingRules,
  runValidation,
  async (req, res) => {
    const { title, description, company, budget, budgetType, skills, location, deadline } =
      req.body;

    try {
      const listing = new JobListing({
        title,
        description,
        company,
        budget,
        budgetType,
        skills,
        location,
        deadline,
        postedBy: req.user.id,
      });

      await listing.save();
      res.status(201).json(listing);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

/**
 * @route   POST /api/jobs/:id/apply
 * @desc    Apply to a job listing
 * @access  Private — freelancer role only
 */
router.post("/:id/apply", auth, requireRole("freelancer"), async (req, res) => {
  try {
    const listing = await JobListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Job listing not found" });
    }

    if (listing.status === "Closed") {
      return res.status(400).json({ message: "This listing is no longer accepting applications" });
    }

    // Prevent duplicate applications
    const alreadyApplied = listing.applicants.some(
      (applicantId) => applicantId.toString() === req.user.id
    );

    if (alreadyApplied) {
      return res.status(400).json({ message: "You have already applied to this listing" });
    }

    listing.applicants.push(req.user.id);
    await listing.save();

    res.json({ message: "Application submitted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * @route   GET /api/jobs/my/applied
 * @desc    Get all listings the logged-in developer has applied to
 * @access  Private — freelancer role only
 */
router.get("/my/applied", auth, requireRole("freelancer"), async (req, res) => {
  try {
    const listings = await JobListing.find({
      applicants: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(listings);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * @route   PATCH /api/jobs/:id/close
 * @desc    Close a job listing (stop accepting applications)
 * @access  Private — client who posted it only
 */
router.patch("/:id/close", auth, requireRole("client"), async (req, res) => {
  try {
    const listing = await JobListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Job listing not found" });
    }

    // Only the client who posted it can close it
    if (listing.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to close this listing" });
    }

    listing.status = "Closed";
    await listing.save();

    res.json({ message: "Listing closed successfully", listing });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * @route   GET /api/jobs/my/posted
 * @desc    Get all listings posted by the logged-in client
 * @access  Private — client role only
 */
router.get("/my/posted", auth, requireRole("client"), async (req, res) => {
  try {
    const listings = await JobListing.find({ postedBy: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(listings);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
