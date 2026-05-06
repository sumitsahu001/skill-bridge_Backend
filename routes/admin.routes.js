const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const User = require('../models/User');
const JobListing = require('../models/JobListing');
const Activity = require('../models/Activity');

// ALL routes here are protected and require 'admin' role
router.use(auth, requireRole('admin'));

/**
 * @route GET /api/admin/users
 * @desc Get all users with search, filter, and pagination
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role, status } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status; // assuming status field exists or using active/inactive logic

    const users = await User.find(query)
      .select('-password') // CRITICAL: Never return passwords
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route GET /api/admin/activities
 * @desc Get platform-wide activity logs
 */
router.get('/activities', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const activities = await Activity.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Activity.countDocuments();

    res.json({
      activities,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route GET /api/admin/jobs
 * @desc Get all jobs with recruiter details and applicant counts
 */
router.get('/jobs', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const jobs = await JobListing.find()
      .populate('recruiter', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Map to include applicant count
    const jobsWithCounts = jobs.map(job => ({
      ...job._doc,
      applicantCount: job.applicants ? job.applicants.length : 0
    }));

    const total = await JobListing.countDocuments();

    res.json({
      jobs: jobsWithCounts,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route GET /api/admin/jobs/:id
 * @desc Get specific job details with full applicant details
 */
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await JobListing.findById(req.params.id)
      .populate('recruiter', 'name email mobile')
      .populate('applicants', 'name email mobile city');

    if (!job) return res.status(404).json({ message: 'Job not found' });

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route GET /api/admin/insights/jobs
 * @desc Get high-level summary of job activity (postings and applications)
 */
router.get('/insights/jobs', async (req, res) => {
  try {
    const totalJobs = await JobListing.countDocuments();
    
    // Get recent postings from Activity logs
    const recentPostings = await Activity.find({ action: 'JOB_POSTED' })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent applications from Activity logs
    const recentApps = await Activity.find({ action: 'APPLICATION_SUBMITTED' })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalJobs,
      recentPostings: recentPostings.map(p => ({
        recruiter: p.userName,
        jobTitle: p.target,
        time: p.createdAt
      })),
      recentApplications: recentApps.map(a => ({
        applicant: a.userName,
        jobTitle: a.target,
        time: a.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route PATCH /api/admin/users/:id/status
 * @desc Block/Unblock a user
 */
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // e.g. 'Active' or 'Blocked'
    const user = await User.findById(req.params.id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    // We might need to add a 'status' field to User model if not present
    // For now, let's assume we update a field called 'status'
    user.status = status;
    await user.save();

    // Log this action
    await Activity.create({
      user: req.user.id,
      userName: req.user.name,
      action: 'STATUS_CHANGED',
      target: user.email,
      metadata: { newStatus: status }
    });

    res.json({ message: `User status updated to ${status}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
