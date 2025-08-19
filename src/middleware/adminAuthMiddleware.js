module.exports = function adminAuthMiddleware(req, res, next) {
  // Assumes req.user is populated by previous auth middleware
  if (req.user && req.user.roleId && req.user.roleId.name === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Admins only" });
}
