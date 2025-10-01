const express = require("express");
const User = require("../Model/User");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const users = await User.find();
        res.json({
            success: true,
            message: "Get users successfully",
            data: users
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Error getting users",
            error: err.message
        });
    }
});

// Export router
module.exports = router;