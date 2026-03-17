function requireAuth(req, res, next) {

  if (!req.session.admin) {
    return res.redirect("/auth");
  }

  next();
}

module.exports = requireAuth;