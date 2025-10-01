const express = require("express");
const User = require("../Model/User");
const { authenticateToken, authorizeRole, checkUserStatus } = require("../../shared/middleware/AuthMiddleware");
const redisService = require("../../shared/services/RedisService");

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

        // Check Redis cache first
        const cachedUser = await redisService.getUser(id);
        if (cachedUser) {
            return res.json({
                success: true,
                message: "Lấy thông tin user thành công (cached)",
                data: cachedUser,
                cached: true
            });
        }

        const user = await User.findById(id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user"
            });
        }

        // Cache for 1 hour
        await redisService.cacheUser(id, user, 3600);

        res.json({
            success: true,
            message: "Lấy thông tin user thành công",
            data: user,
            cached: false
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
        const {
            username, email, role, status, note, phone, address,
            serviceCenter, specialization, skills, availability
        } = req.body;

        // Kiểm tra quyền
        if (req.user.role !== "admin" && req.user.userId !== id) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền cập nhật user này"
            });
        }

        // User thường chỉ có thể cập nhật thông tin cá nhân
        const updateData = { username, email, note, phone, address };

        // Admin có thể cập nhật tất cả fields
        if (req.user.role === "admin") {
            updateData.role = role;
            updateData.status = status;
            updateData.serviceCenter = serviceCenter;
            updateData.specialization = specialization;
            updateData.skills = skills;
            updateData.availability = availability;
        }

        // Technician có thể cập nhật specialization, skills, availability
        if (req.user.role === "technician" && req.user.userId === id) {
            updateData.specialization = specialization;
            updateData.skills = skills;
            updateData.availability = availability;
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

        // Invalidate cache after update
        await redisService.invalidateUser(id);

        // If technician data changed, invalidate technicians cache
        if (updatedUser.role === "technician" ||
            (updateData.specialization || updateData.skills || updateData.availability !== undefined)) {
            await redisService.invalidateTechnicians();
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

// Get available technicians (admin và service_staff) - with Redis cache
router.get("/technicians/available", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
    try {
        const { specialization, serviceCenter } = req.query;
        const filters = { specialization, serviceCenter };

        // Check Redis cache first
        const cachedTechnicians = await redisService.getTechnicians(filters);
        if (cachedTechnicians) {
            return res.json({
                success: true,
                message: "Lấy danh sách technicians thành công",
                data: cachedTechnicians,
                count: cachedTechnicians.length
            });
        }

        const filter = {
            role: "technician",
            status: "active",
            availability: true
        };

        if (specialization) {
            filter.specialization = { $in: [specialization] };
        }

        if (serviceCenter) {
            filter["serviceCenter.id"] = serviceCenter;
        }

        const technicians = await User.find(filter)
            .select("-password -refreshToken")
            .sort({ workload: 1, "performanceMetrics.qualityScore": -1 });

        // Cache for 5 minutes
        await redisService.cacheTechnicians(filters, technicians, 300);

        res.json({
            success: true,
            message: "Lấy danh sách technicians thành công",
            data: technicians,
            count: technicians.length
        });
    } catch (err) {
        console.error("Get technicians error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách technicians",
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