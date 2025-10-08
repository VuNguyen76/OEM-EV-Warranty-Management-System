const User = require("../Model/User");
const responseHelper = require("../../shared/utils/responseHelper");
const { getCached, setCached, clearCachePatterns } = require("../../shared/services/CacheHelper");
const { handleControllerError, safeCacheOperation } = require("../../shared/utils/errorHelper");

const getAllUsers = async (req, res) => {
    try {
        const cacheKey = "users:all";

        // Try cache first
        const cachedUsers = await safeCacheOperation(
            () => getCached(cacheKey),
            'getAllUsers-cache-get'
        );

        if (cachedUsers) {
            return responseHelper.success(res, {
                users: cachedUsers,
                count: cachedUsers.length
            }, "Lấy danh sách users thành công (cached)");
        }

        const users = await User.find().select("-password");

        // Cache for 10 minutes
        await safeCacheOperation(
            () => setCached(cacheKey, users, 600),
            'getAllUsers-cache-set'
        );

        return responseHelper.success(res, {
            users,
            count: users.length
        }, "Lấy danh sách users thành công");
    } catch (err) {
        return handleControllerError(res, 'getAllUsers', err, "Lỗi server khi lấy danh sách users");
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.sub || req.user.userId;

        if (req.user.role !== "admin" && userId !== id) {
            return responseHelper.error(res, "Không có quyền truy cập thông tin user này", 403);
        }

        const cacheKey = `user:${id}`;

        // Try cache first
        const cachedUser = await safeCacheOperation(
            () => getCached(cacheKey),
            'getUserById-cache-get'
        );

        if (cachedUser) {
            return responseHelper.success(res, cachedUser, "Lấy thông tin user thành công (cached)");
        }

        const user = await User.findById(id).select("-password");
        if (!user) {
            return responseHelper.error(res, "Không tìm thấy user", 404);
        }

        // Cache for 1 hour
        await safeCacheOperation(
            () => setCached(cacheKey, user, 3600),
            'getUserById-cache-set'
        );

        return responseHelper.success(res, user, "Lấy thông tin user thành công");
    } catch (err) {
        return handleControllerError(res, 'getUserById', err, "Lỗi server khi lấy thông tin user");
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
            return responseHelper.error(res, "Không có quyền cập nhật user này", 403);
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
            return responseHelper.error(res, "Không tìm thấy user", 404);
        }

        // Clear cache
        const cachePatterns = ["users:*", `user:${id}`];
        if (updatedUser.role === "technician" ||
            (updateData.specialization || updateData.skills || updateData.availability !== undefined)) {
            cachePatterns.push("technicians:*");
        }

        await safeCacheOperation(
            () => clearCachePatterns(cachePatterns),
            'updateUser-cache-clear'
        );

        return responseHelper.success(res, updatedUser, "Cập nhật user thành công");
    } catch (err) {
        return handleControllerError(res, 'updateUser', err, "Lỗi server khi cập nhật user");
    }
};

const getAvailableTechnicians = async (req, res) => {
    try {
        const { specialization, serviceCenter } = req.query;
        const cacheKey = `technicians:${specialization || 'all'}:${serviceCenter || 'all'}`;

        // Try cache first
        const cachedTechnicians = await safeCacheOperation(
            () => getCached(cacheKey),
            'getTechnicians-cache-get'
        );

        if (cachedTechnicians) {
            return responseHelper.success(res, {
                technicians: cachedTechnicians,
                count: cachedTechnicians.length
            }, "Lấy danh sách technicians thành công (cached)");
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
        await safeCacheOperation(
            () => setCached(cacheKey, technicians, 300),
            'getTechnicians-cache-set'
        );

        return responseHelper.success(res, {
            technicians,
            count: technicians.length
        }, "Lấy danh sách technicians thành công");
    } catch (err) {
        return handleControllerError(res, 'getAvailableTechnicians', err, "Lỗi server khi lấy danh sách technicians");
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.sub || req.user.userId;

        if (userId === id) {
            return responseHelper.error(res, "Không thể xóa chính mình", 400);
        }

        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return responseHelper.error(res, "Không tìm thấy user", 404);
        }

        // Clear cache
        await safeCacheOperation(
            () => clearCachePatterns(["users:*", `user:${id}`, "technicians:*"]),
            'deleteUser-cache-clear'
        );

        return responseHelper.success(res, {
            id: deletedUser._id,
            username: deletedUser.username
        }, "Xóa user thành công");
    } catch (err) {
        return handleControllerError(res, 'deleteUser', err, "Lỗi server khi xóa user");
    }
};

const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.sub || req.user.userId;

        // Check permission - only admin or own user
        if (req.user.role !== "admin" && userId !== id) {
            return responseHelper.error(res, "Không có quyền thay đổi mật khẩu của user này", 403);
        }

        // Validate input
        if (!newPassword || newPassword.length < 6) {
            return responseHelper.error(res, "Mật khẩu mới phải có ít nhất 6 ký tự", 400);
        }

        const user = await User.findById(id);
        if (!user) {
            return responseHelper.error(res, "Không tìm thấy user", 404);
        }

        // If not admin, verify old password
        if (req.user.role !== "admin") {
            if (!oldPassword) {
                return responseHelper.error(res, "Cần nhập mật khẩu cũ", 400);
            }

            const isOldPasswordValid = await user.comparePassword(oldPassword);
            if (!isOldPasswordValid) {
                return responseHelper.error(res, "Mật khẩu cũ không đúng", 400);
            }
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Clear cache
        await safeCacheOperation(
            () => clearCachePatterns(["users:*", `user:${id}`]),
            'changePassword-cache-clear'
        );

        return responseHelper.success(res, null, "Đổi mật khẩu thành công");
    } catch (err) {
        return handleControllerError(res, 'changePassword', err, "Lỗi server khi đổi mật khẩu");
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    getAvailableTechnicians,
    deleteUser,
    changePassword
};
