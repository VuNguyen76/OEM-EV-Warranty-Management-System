const User = require("../Model/User");
const redisService = require("../../shared/services/RedisService");

const getAllUsers = async (req, res) => {
    try {
        const cacheKey = "users:all";

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
        }

        const users = await User.find().select("-password");

        try {
            await redisService.set(cacheKey, JSON.stringify(users), 600);
        } catch (cacheError) {
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

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.sub || req.user.userId;

        if (req.user.role !== "admin" && userId !== id) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền truy cập thông tin user này"
            });
        }
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
        }

        const user = await User.findById(id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user"
            });
        }

        try {
            await redisService.cacheUser(id, user, 3600);
        } catch (cacheError) {
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

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            username, email, role, status, note, phone, address,
            serviceCenter, specialization, skills, availability
        } = req.body;
        const userId = req.user.sub || req.user.userId;

        if (req.user.role !== "admin" && userId !== id) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền cập nhật user này"
            });
        }

        const updateData = { username, email, note, phone, address };

        if (req.user.role === "admin") {
            updateData.role = role;
            updateData.status = status;
            updateData.serviceCenter = serviceCenter;
            updateData.specialization = specialization;
            updateData.skills = skills;
            updateData.availability = availability;
        }

        if (req.user.role === "technician" && userId === id) {
            updateData.specialization = specialization;
            updateData.skills = skills;
            updateData.availability = availability;
        }

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

        // Xóa cache liên quan
        try {
            await redisService.invalidateUser(id);
            await redisService.del("users:all");

            if (updatedUser.role === "technician" ||
                (updateData.specialization || updateData.skills || updateData.availability !== undefined)) {
                await redisService.invalidateTechnicians();
            }

        } catch (cacheError) {
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

const getAvailableTechnicians = async (req, res) => {
    try {
        const { specialization, serviceCenter } = req.query;
        const filters = { specialization, serviceCenter };

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

        try {
            await redisService.cacheTechnicians(filters, technicians, 300);
        } catch (cacheError) {
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

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.sub || req.user.userId;

        if (userId === id) {
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
