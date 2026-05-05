// middleware/requireRole.js
// Usage: router.post("/", auth, requireRole("client"), handler)
// This runs AFTER auth middleware, so req.user is already set.

function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
    }

    next();
  };
}

module.exports = requireRole;
