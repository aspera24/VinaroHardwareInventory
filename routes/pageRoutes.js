const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/authMiddleware");


router.get("/:username/page/*", requireAuth, (req, res) => {

  const { username } = req.params;

  if (username !== req.session.admin) {
    return res.status(404).send("Invalid admin");
  }

  res.sendFile(process.cwd() + "/public/app.html");

});


module.exports = router;