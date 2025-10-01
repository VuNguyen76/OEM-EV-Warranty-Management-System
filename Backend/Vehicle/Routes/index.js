const express = require("express");
const router = express.Router();

// GET[/api/vehicles]
router.get("/", (req, res) => {
    res.json({ message: "Vehicle service" });
});

module.exports = router;
