const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/authMiddleware");
const path = require("path");


const validPages = ["dashboard", "inventory", "borrow", "reminder", "order", "logs"];

router.get("/:username/page/:page", (req, res) => {
    const { username, page } = req.params;

    // INVALID PAGE
    if (!validPages.includes(page)) {
        return res.status(404).send("404 Page Not Found");
    }

    // NOT LOGGED IN
    if (!req.session.admin || req.session.admin !== username) {
        return res.redirect("/auth");
    }

    // VALID → serve main SPA
    res.sendFile(process.cwd() + "/public/app.html");
});

router.get("/:username/profile", requireAuth, (req, res) => {

  const { username } = req.params;

  if (username !== req.session.admin) {
    return res.status(404).send("Invalid admin");
  }

  res.sendFile(path.join(process.cwd(), "public/profile.html"));
});

module.exports = router;