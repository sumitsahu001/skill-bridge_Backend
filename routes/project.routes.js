const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Project = require("../models/Project");
const Activity = require("../models/Activity");

// @route   GET /api/projects/my-gigs
// @desc    Get all projects for the logged-in developer
// @access  Private
router.get("/my-gigs", auth, async (req, res) => {
  try {
    const projects = await Project.find({ developer: req.user.id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/projects
// @desc    Create a project (For testing/Client use)
// @access  Private
router.post("/", auth, async (req, res) => {
  const { title, clientName, budget, deadline, description, status } = req.body;

  try {
    const newProject = new Project({
      title,
      clientName,
      developer: req.user.id, // In a real app, this might be selected or assigned
      budget,
      deadline,
      description,
      status
    });

    const project = await newProject.save();
    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PATCH /api/projects/:id/status
// @desc    Update project status
// @access  Private
router.patch("/:id/status", auth, async (req, res) => {
  const { status } = req.body;

  try {
    let project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ message: "Project not found" });

    // Make sure user owns the project (as developer)
    if (project.developer.toString() !== req.user.id) {
      return res.status(401).json({ message: "User not authorized" });
    }

    project.status = status;
    await project.save();

    // Log Activity
    await Activity.create({
      user: req.user.id,
      userName: req.user.name,
      action: status === 'Completed' ? 'STATUS_CHANGED' : 'JOB_CLOSED', // Reusing existing enums or we could add more
      target: `Project: ${project.title}`,
      metadata: { newStatus: status }
    });

    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
