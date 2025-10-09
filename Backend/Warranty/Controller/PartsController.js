const responseHelper = require("../../shared/utils/responseHelper");
const queryHelper = require("../../shared/utils/queryHelper");
const { getCached, setCached, clearCachePatterns } = require("../../shared/services/CacheHelper");
const { verifyVINInVehicleService, normalizeVIN } = require("../../shared/services/VehicleServiceHelper");

// Models
let Part, VehiclePart, WarrantyVehicle;

// Khởi tạo models
async function initializeModels() {
    if (!Part || !VehiclePart || !WarrantyVehicle) {
        const { connectToWarrantyDB } = require('../../shared/database/warrantyConnection');
        await connectToWarrantyDB();
        Part = require('../Model/Part')();
        VehiclePart = require('../Model/VehiclePart')();
        WarrantyVehicle = require('../Model/WarrantyVehicle')();
    }
}

// Create Part
const createPart = async (req, res) => {
    try {
        const { partName, partCode, partNumber, category, description, cost, supplier, warrantyPeriod } = req.body;

        // Basic validation handled by ValidationMiddleware at route level

        // Check if part code already exists
        const existingPart = await Part.findOne({ partCode });
        if (existingPart) {
            return responseHelper.error(res, "Mã phụ tùng đã tồn tại", 400);
        }

        // Kiểm tra các trường bắt buộc
        if (!warrantyPeriod) {
            return responseHelper.error(res, "Warranty period là bắt buộc", 400);
        }

        const part = new Part({
            name: partName,
            partCode,
            partNumber,
            category,
            description,
            cost: parseFloat(cost),
            supplier,
            warrantyPeriod,
            createdBy: req.user.email
        });

        await part.save();

        // Xóa cache
        await clearCachePatterns(["parts:*"]);

        return responseHelper.success(res, part, "Tạo phụ tùng thành công", 201);
    } catch (error) {
        console.error('❌ Error in createPart:', error);
        return responseHelper.error(res, "Lỗi khi tạo phụ tùng", 500);
    }
};

// Get All Parts
const getAllParts = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, search, lowStock } = req.query;
        const cacheKey = `parts:list:${JSON.stringify(req.query)}`;

        // Thử cache trước
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy danh sách phụ tùng thành công (từ cache)");
        }

        // Xây dựng query tìm kiếm
        const searchQuery = {};

        if (category) {
            searchQuery.category = category;
        }

        if (search) {
            searchQuery.$or = [
                { partName: { $regex: search, $options: 'i' } },
                { partCode: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (lowStock === 'true') {
            searchQuery.stockQuantity = { $lte: 10 };
        }

        // Lấy kết quả phân trang
        const { skip, limitNum } = queryHelper.parsePagination(page, limit);
        const [parts, total] = await Promise.all([
            Part.find(searchQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Part.countDocuments(searchQuery)
        ]);

        const result = {
            parts,
            pagination: responseHelper.createPagination(page, limit, total)
        };

        // Cache trong 5 minutes
        await setCached(cacheKey, result, 300);

        return responseHelper.success(res, result, "Lấy danh sách phụ tùng thành công");
    } catch (error) {
        console.error('❌ Error in getAllParts:', error);
        return responseHelper.error(res, "Lỗi khi lấy danh sách phụ tùng", 500);
    }
};

// Get Part by ID
const getPartById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `parts:${id}`;

        // Thử cache trước
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy thông tin phụ tùng thành công (từ cache)");
        }

        const part = await Part.findById(id);
        if (!part) {
            return responseHelper.error(res, "Không tìm thấy phụ tùng", 404);
        }

        // Cache trong 10 minutes
        await setCached(cacheKey, part, 600);

        return responseHelper.success(res, part, "Lấy thông tin phụ tùng thành công");
    } catch (error) {
        console.error('❌ Error in getPartById:', error);
        return responseHelper.error(res, "Lỗi khi lấy thông tin phụ tùng", 500);
    }
};

// Update Part
const updatePart = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body, updatedBy: req.user.email };

        const part = await Part.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!part) {
            return responseHelper.error(res, "Không tìm thấy phụ tùng", 404);
        }

        // Xóa cache
        await clearCachePatterns(["parts:*"]);

        return responseHelper.success(res, part, "Cập nhật phụ tùng thành công");
    } catch (error) {
        console.error('❌ Error in updatePart:', error);
        return responseHelper.error(res, "Lỗi khi cập nhật phụ tùng", 500);
    }
};

// Delete Part
const deletePart = async (req, res) => {
    try {
        const { id } = req.params;

        const part = await Part.findByIdAndDelete(id);
        if (!part) {
            return responseHelper.error(res, "Không tìm thấy phụ tùng", 404);
        }

        // Xóa cache
        await clearCachePatterns(["parts:*"]);

        return responseHelper.success(res, null, "Xóa phụ tùng thành công");
    } catch (error) {
        console.error('❌ Error in deletePart:', error);
        return responseHelper.error(res, "Lỗi khi xóa phụ tùng", 500);
    }
};

// Get Low Stock Parts
const getLowStockParts = async (req, res) => {
    try {
        const { threshold = 10 } = req.query;
        const cacheKey = `parts:lowstock:${threshold}`;

        // Thử cache trước
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy danh sách phụ tùng sắp hết thành công (từ cache)");
        }

        const lowStockParts = await Part.find({
            stockQuantity: { $lte: parseInt(threshold) }
        }).sort({ stockQuantity: 1 });

        // Cache trong 2 minutes
        await setCached(cacheKey, lowStockParts, 120);

        return responseHelper.success(res, lowStockParts, "Lấy danh sách phụ tùng sắp hết thành công");
    } catch (error) {
        console.error('❌ Error in getLowStockParts:', error);
        return responseHelper.error(res, "Lỗi khi lấy danh sách phụ tùng sắp hết", 500);
    }
};

/**
 * Thêm phụ tùng vào xe
 * Gắn phụ tùng với số serial cụ thể vào xe tại vị trí được chỉ định
 *
 * @route POST /api/warranty/vehicle-parts
 * @access technician, service_staff, admin
 * @param {string} vin - VIN của xe
 * @param {string} partId - ID của phụ tùng
 * @param {string} serialNumber - Số serial của phụ tùng
 * @param {string} position - Vị trí lắp đặt trên xe
 * @param {Date} installationDate - Ngày lắp đặt
 * @param {string} notes - Ghi chú bổ sung (tùy chọn)
 */
const addPartToVehicle = async (req, res) => {
    try {
        const { vin, partId, serialNumber, installationDate, installedBy, position, notes } = req.body;

        // Các trường bắt buộc for part installation
        if (!vin || !partId || !serialNumber || !position) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc: VIN, partId, serialNumber, position", 400);
        }

        // ✅ Kiểm tra xe có tồn tại trong Vehicle service
        try {
            await verifyVINInVehicleService(vin, req.headers.authorization);
        } catch (error) {
            if (error.message === 'VEHICLE_NOT_FOUND') {
                return responseHelper.error(res, "Không tìm thấy xe với VIN này. Vui lòng đăng ký xe trước", 404);
            }
            return responseHelper.error(res, "Không thể xác minh xe trong hệ thống. Vui lòng đăng ký xe trước", 400);
        }

        // Check if part exists
        const part = await Part.findById(partId);
        if (!part) {
            return responseHelper.error(res, "Không tìm thấy phụ tùng", 404);
        }

        // Check if serial number already exists
        const existingVehiclePart = await VehiclePart.findOne({ serialNumber });
        if (existingVehiclePart) {
            return responseHelper.error(res, "Số serial này đã được sử dụng", 400);
        }

        // Calculate warranty end date
        const installDate = installationDate ? new Date(installationDate) : new Date();
        const warrantyEndDate = new Date(installDate);
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + part.warrantyPeriod);

        // Sử dụng atomic operation để cập nhật stock và tạo vehicle part
        const mongoose = require('mongoose');
        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                // Atomic stock update with condition check
                const updatedPart = await Part.findOneAndUpdate(
                    {
                        _id: partId,
                        stockQuantity: { $gt: 0 }
                    },
                    {
                        $inc: { stockQuantity: -1 }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!updatedPart) {
                    throw new Error('Phụ tùng đã hết hàng hoặc không đủ số lượng');
                }

                // Create vehicle part record
                const vehiclePart = new VehiclePart({
                    vin: normalizeVIN(vin), // ✅ Sử dụng VIN làm tham chiếu chính (không cần vehicleId)
                    partId,
                    serialNumber,
                    position: position || 'Unknown',
                    installationDate: installDate,
                    warrantyEndDate,
                    installedBy: installedBy || req.user.email, // ✅ Sử dụng email thay vì ObjectId
                    notes,
                    createdBy: req.user.email
                });

                await vehiclePart.save({ session });

                // Store for response (outside transaction)
                req.vehiclePart = vehiclePart;
            });
        } finally {
            await session.endSession();
        }

        // Xóa cache
        await clearCachePatterns(["parts:*", "vehicle-parts:*"]);

        // Populate part info for response
        const vehiclePart = req.vehiclePart;
        await vehiclePart.populate('partId');

        return responseHelper.success(res, {
            vehiclePart,
            message: `Gắn phụ tùng ${vehiclePart.partId.name} (S/N: ${serialNumber}) vào xe ${vin} tại vị trí ${position} thành công`
        }, "Gắn số seri phụ tùng thành công", 201);
    } catch (error) {
        console.error('❌ Error in addPartToVehicle:', error);
        return responseHelper.error(res, "Lỗi khi thêm phụ tùng vào xe", 500);
    }
};

// Get Vehicle Parts
const getVehicleParts = async (req, res) => {
    try {
        const { vin } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        const cacheKey = `vehicle-parts:${vin}:${JSON.stringify(req.query)}`;

        // Thử cache trước
        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy danh sách phụ tùng xe thành công (từ cache)");
        }

        // ✅ Sử dụng VIN trực tiếp (không cần lookup vehicleId)
        const searchQuery = { vin: normalizeVIN(vin) };
        if (status) {
            searchQuery.status = status;
        }

        // Lấy kết quả phân trang
        const { skip, limitNum } = queryHelper.parsePagination(page, limit);
        const [vehicleParts, total] = await Promise.all([
            VehiclePart.find(searchQuery)
                .populate('partId')
                .sort({ installationDate: -1 })
                .skip(skip)
                .limit(limitNum),
            VehiclePart.countDocuments(searchQuery)
        ]);

        const result = {
            vehicleParts,
            pagination: responseHelper.createPagination(page, limit, total)
        };

        // Cache trong 5 minutes
        await setCached(cacheKey, result, 300);

        return responseHelper.success(res, result, "Lấy danh sách phụ tùng xe thành công");
    } catch (error) {
        console.error('❌ Error in getVehicleParts:', error);
        return responseHelper.error(res, "Lỗi khi lấy danh sách phụ tùng xe", 500);
    }
};

module.exports = {
    initializeModels,
    createPart,
    getAllParts,
    getPartById,
    updatePart,
    deletePart,
    getLowStockParts,
    addPartToVehicle,
    getVehicleParts
};
