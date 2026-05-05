// models/JobListing.js
const mongoose = require("mongoose");

const jobListingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    // The client/recruiter who posted this listing
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    // Fixed = one-time payment, Hourly = per-hour rate
    budgetType: {
      type: String,
      enum: ["Fixed", "Hourly"],
      default: "Fixed",
    },
    // Skills the client is looking for
    skills: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
      enum: ["Remote", "Hybrid", "On-site"],
      default: "Remote",
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
    },
    // Array of developer user IDs who have applied
    applicants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Text index on title + description so MongoDB can do full-text search
// This powers the search bar on the frontend
jobListingSchema.index({ title: "text", description: "text", company: "text" });

module.exports = mongoose.model("JobListing", jobListingSchema);
