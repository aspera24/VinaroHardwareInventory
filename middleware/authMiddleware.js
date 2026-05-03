function requireAuth(req, res, next) {
  if (!req.session.adminId) {
    return res.redirect("/auth");
  }
  next();
}

module.exports = requireAuth;