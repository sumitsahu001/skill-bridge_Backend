// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    mobile: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Mobile must be 10 digits"],
    },
    city: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["freelancer", "client"],
      required: true,
      default: "freelancer",
    },
  },
  { timestamps: true }
);

// small quality-of-life: hide password & __v in responses
userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
