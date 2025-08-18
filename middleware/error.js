// middleware/error.js

// not found handler (for unknown routes)
function notFound(req, res, next) {
    res.status(404).json({ message: "Route not found" });
  }
  
  // central error handler
  // eslint-disable-next-line no-unused-vars
  function errorHandler(err, req, res, next) {
    console.error(err);
  
    // duplicate key (e.g., unique email)
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already registered" });
    }
  
    return res.status(err.status || 500).json({
      message: err.message || "Server error",
    });
  }
  
  module.exports = { notFound, errorHandler };
  