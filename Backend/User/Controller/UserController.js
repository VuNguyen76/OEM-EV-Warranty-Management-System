const User = require("../Model/User");
const redisService = require("../../shared/services/RedisService");

// Get all users (admin only)
const getAllUsers = async (req, res) => {
    try {
        const cacheKey = "users:all";

        // Check Redis cache first (with error handling)
        let cachedUsers = null;
        try {
            cachedUsers = await redisService.get(cacheKey);
            if (cachedUsers) {
                const users = JSON.parse(cachedUsers);
                return res.json({
                    success: true,
                    message: "Lấy danh sách users thành công (cached)",
                    data: users,
                    count: users.length,
                    cached: true
                });
            }
        } catch (cacheError) {
            // Continue without cache - fail-safe approach
        }

        const users = await User.find().select("-password");

        // Cache for 10 minutes (with error handling)
        try {
            await redisService.set(cacheKey, JSON.stringify(users), 600);
        } catch (cacheError) {
            // Continue without caching - fail-safe approach
        }

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
};

// Get user by ID (admin or self)
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra quyền: admin hoặc chính user đó
        if (req.user.role !== "admin" && req.user.userId !== id) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập thông tin user này"
            });
        }

        // Check Redis cache first (with error handling)
        let cachedUser = null;
        try {
            cachedUser = await redisService.getUser(id);
            if (cachedUser) {
                return res.json({
                    success: true,
                    message: "Lấy thông tin user thành công (cached)",
                    data: cachedUser,
                    cached: true
                });
            }
        } catch (cacheError) {
            // Continue without cache - fail-safe approach
        }

        const user = await User.findById(id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user"
            });
        }

        // Cache for 1 hour (with error handling)
        try {
            await redisService.cacheUser(id, user, 3600);
        } catch (cacheError) {
            // Continue without caching - fail-safe approach
        }

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
};

// Update user (admin or self)
const updateUser = async (req, res) => {
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

        // Smart cache invalidation (with error handling)
        try {
            // Invalidate specific user cache
            await redisService.invalidateUser(id);

            // Invalidate all users cache (since user list changed)
            await redisService.del("users:all");

            // If technician data changed, invalidate technicians cache
            if (updatedUser.role === "technician" ||
                (updateData.specialization || updateData.skills || updateData.availability !== undefined)) {
                await redisService.invalidateTechnicians();
            }

        } catch (cacheError) {
            // Continue without cache invalidation - fail-safe approach
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
};

// Get available technicians (admin and service_staff) - with Redis cache
const getAvailableTechnicians = async (req, res) => {
    try {
        const { specialization, serviceCenter } = req.query;
        const filters = { specialization, serviceCenter };

        // Check Redis cache first (with error handling)
        let cachedTechnicians = null;
        try {
            cachedTechnicians = await redisService.getTechnicians(filters);
            if (cachedTechnicians) {
                return res.json({
                    success: true,
                    message: "Lấy danh sách technicians thành công (cached)",
                    data: cachedTechnicians,
                    count: cachedTechnicians.length,
                    cached: true
                });
            }
        } catch (cacheError) {
            // Continue without cache - fail-safe approach
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

        // Cache for 5 minutes (with error handling)
        try {
            await redisService.cacheTechnicians(filters, technicians, 300);
        } catch (cacheError) {
            // Continue without caching - fail-safe approach
        }

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
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
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
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    getAvailableTechnicians,
    deleteUser
};
