const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/authMiddleware");
const path = require("path");


router.get("/:username/page/*", requireAuth, (req, res) => {

  const { username } = req.params;

  if (username !== req.session.admin) {
    return res.status(404).send("Invalid admin");
  }

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