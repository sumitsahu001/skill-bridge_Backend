// config/db.js
const mongoose = require("mongoose");

async function connectDB(uri) {
  // just being explicit
  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    autoIndex: true, // helpful for unique email
  });

  console.log("✓ MongoDB connected");
}

module.exports = connectDB;
