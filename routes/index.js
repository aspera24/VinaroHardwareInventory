const express = require("express");
const router = express.Router();

// backend route for customers
router.get("/customers", (req, res) => {
    res.json([
        { id: 1, name: "John Doe" }
    ]);
});

// backend add customer
router.post("/add-customer", (req, res) => {
    res.json({ message: "Customer added!" });
});

// backend appointments
router.get("/appointments", (req, res) => {
    res.json([
        { id: 1, time: "10:00" },
        { id: 2, time: "11:00" }
    ]);
});

module.exports = router;
