const express = require("express");
const User = require("../Model/User");
const { authenticateToken, authorizeRole, checkUserStatus } = require("../Middleware/AuthMiddleware");

const router = express.Router();

// Get all users (chỉ admin)
router.get("/", authenticateToken, authorizeRole("admin"), async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json({
            success: true,
            message: "Lấy danh sách users thành công",
            data: users,
            count: users.length
        });
    } catch (err) {
        console.error("Get users error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách users",
            error: err.message
        });
    }
});

// Get user by ID (admin hoặc chính user đó)
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra quyền: admin hoặc chính user đó
        if (req.user.role !== "admin" && req.user.userId !== id) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập thông tin user này"
            });
        }

        const user = await User.findById(id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user"
            });
        }

        res.json({
            success: true,
            message: "Lấy thông tin user thành công",
            data: user
        });
    } catch (err) {
        console.error("Get user by ID error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin user",
            error: err.message
        });
    }
});

// Update user (admin hoặc chính user đó)
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role, status, note } = req.body;

        // Kiểm tra quyền
        if (req.user.role !== "admin" && req.user.userId !== id) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền cập nhật user này"
            });
        }

        // User thường không thể thay đổi role và status
        const updateData = { username, email, note };
        if (req.user.role === "admin") {
            updateData.role = role;
            updateData.status = status;
        }

        // Loại bỏ các field undefined
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        updateData.updatedAt = new Date();

        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user"
            });
        }

        res.json({
            success: true,
            message: "Cập nhật user thành công",
            data: updatedUser
        });
    } catch (err) {
        console.error("Update user error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật user",
            error: err.message
        });
    }
});

// Delete user (chỉ admin)
router.delete("/:id", authenticateToken, authorizeRole("admin"), async (req, res) => {
    try {
        const { id } = req.params;

        // Không cho phép admin xóa chính mình
        if (req.user.userId === id) {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa chính mình"
            });
        }

        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user"
            });
        }

        res.json({
            success: true,
            message: "Xóa user thành công",
            data: { id: deletedUser._id, username: deletedUser.username }
        });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi xóa user",
            error: err.message
        });
    }
});

// Export router
module.exports = router;