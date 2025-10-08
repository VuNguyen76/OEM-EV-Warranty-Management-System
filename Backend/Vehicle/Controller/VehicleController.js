const createVehicleModel = require('../Model/Vehicle');
const responseHelper = require('../../shared/utils/responseHelper');
const queryHelper = require('../../shared/utils/queryHelper');
const redisService = require('../../shared/services/RedisService');
const { getCached, setCached, clearCachePatterns } = require('../../shared/services/CacheHelper');
const { normalizeVIN, isValidVINFormat } = require('../../shared/services/VehicleServiceHelper');

let Vehicle = null;

const initializeModels = () => {
    if (!Vehicle) {
        Vehicle = createVehicleModel();
    }
};

/**
 * UC1: Đăng ký xe theo VIN
 * - Nhập VIN và thông tin chủ xe
 * - Tự động lấy thông tin model từ Manufacturing
 * - Lưu vào Vehicle DB
 */
const registerVehicle = async (req, res) => {
    try {
        const {
            vin,
            // ✅ THÔNG TIN KHÁCH HÀNG (do khách hàng cung cấp cho nhân viên dịch vụ)
            ownerName,
            ownerPhone,
            ownerEmail,
            ownerAddress,
            purchaseDate,
            purchasePrice,
            dealerName,
            // ✅ SERVICE CENTER INFORMATION (from authenticated staff user)
            serviceCenterId, // Optional - can use from req.user if not provided
            notes
        } = req.body;

        if (!vin || !ownerName || !ownerPhone || !ownerAddress || !purchaseDate) {
            return responseHelper.error(res, "Thiếu thông tin bắt buộc: VIN, tên chủ xe, số điện thoại, địa chỉ, ngày mua", 400);
        }

        // ✅ SERVICE CENTER ID: Use from request body or authenticated user
        const actualServiceCenterId = serviceCenterId || req.user.serviceCenterId || req.user.sub;
        if (!actualServiceCenterId) {
            return responseHelper.error(res, "Không xác định được Service Center. Vui lòng liên hệ quản trị viên", 400);
        }

        // Validate purchase date
        const purchaseDateObj = new Date(purchaseDate);
        if (purchaseDateObj > new Date()) {
            return responseHelper.error(res, "Ngày mua không thể trong tương lai", 400);
        }

        if (!isValidVINFormat(vin)) {
            return responseHelper.error(res, "VIN không đúng định dạng (phải 17 ký tự, không chứa I, O, Q)", 400);
        }

        initializeModels();

        const VINLookupService = require('../services/VINLookupService');

        console.log(`🔍 Validating and looking up VIN: ${vin}`);
        const authToken = req.headers.authorization?.replace('Bearer ', '');
        const vehicleInfo = await VINLookupService.validateAndLookupVIN(vin, authToken);
        console.log(`✅ VIN lookup successful:`, {
            vin: vehicleInfo.vin,
            modelName: vehicleInfo.modelName,
            manufacturer: vehicleInfo.manufacturer,
            year: vehicleInfo.year,
            qualityStatus: vehicleInfo.qualityStatus
        });

        const existingVehicle = await VINLookupService.checkVINRegistration(vin);
        if (existingVehicle) {
            return responseHelper.error(res, "VIN này đã được đăng ký", 400);
        }

        const serviceCenterInfo = await VINLookupService.getServiceCenterInfo(actualServiceCenterId);
        console.log(`✅ Service center validated:`, serviceCenterInfo);
        const vehicle = new Vehicle({
            vin: vehicleInfo.vin,
            modelId: vehicleInfo.modelId,
            modelName: vehicleInfo.modelName,
            modelCode: vehicleInfo.modelCode,
            manufacturer: vehicleInfo.manufacturer,
            year: vehicleInfo.year,
            category: vehicleInfo.category,
            color: vehicleInfo.color,
            productionDate: vehicleInfo.productionDate,
            productionBatch: vehicleInfo.productionBatch,
            productionLocation: vehicleInfo.productionLocation,
            plantCode: vehicleInfo.plantCode,
            batteryCapacity: vehicleInfo.batteryCapacity,
            motorPower: vehicleInfo.motorPower,
            variant: vehicleInfo.variant,
            vehicleWarrantyMonths: vehicleInfo.vehicleWarrantyMonths,
            ownerName,
            ownerPhone,
            ownerEmail,
            ownerAddress,
            purchaseDate: purchaseDateObj,
            purchasePrice: purchasePrice || null,
            dealerName: dealerName || null,
            serviceCenterId: serviceCenterInfo.id,
            serviceCenterName: serviceCenterInfo.name,
            serviceCenterCode: serviceCenterInfo.code,
            // ✅ THÔNG TIN NHÂN VIÊN (người đăng ký xe thay mặt khách hàng)
            registeredBy: req.user.email,
            registeredByRole: req.user.role,
            createdBy: req.user.email,
            notes,
            vinValidatedAt: vehicleInfo.validatedAt,
            qualityStatus: vehicleInfo.qualityStatus
        });

        await vehicle.save();
        await clearCachePatterns(["vehicles:*"]);

        console.log(`✅ Vehicle registered successfully: ${vehicle.vin}`);

        // ✅ TỰ ĐỘNG KÍCH HOẠT BẢO HÀNH sau khi đăng ký xe thành công
        let warrantyActivation = null;
        try {
            const WarrantyActivationModel = require('../../Warranty/Model/WarrantyActivation');
            const WarrantyActivation = WarrantyActivationModel();

            // Calculate warranty dates from purchase date
            const warrantyStartDate = purchaseDateObj;
            const warrantyEndDate = new Date(warrantyStartDate);
            warrantyEndDate.setMonth(warrantyEndDate.getMonth() + vehicleInfo.vehicleWarrantyMonths);

            warrantyActivation = new WarrantyActivation({
                vin: vehicleInfo.vin,
                warrantyStartDate,
                warrantyEndDate,
                warrantyMonths: vehicleInfo.vehicleWarrantyMonths,
                warrantySource: 'model',
                warrantyStatus: 'active',
                serviceCenterId: serviceCenterInfo.id,
                serviceCenterName: serviceCenterInfo.name,
                serviceCenterCode: serviceCenterInfo.code,
                // ✅ THÔNG TIN NHÂN VIÊN (người kích hoạt bảo hành thay mặt khách hàng)
                activatedBy: req.user.email,
                activatedByRole: req.user.role,
                activatedDate: new Date(),
                notes: `Auto-activated during vehicle registration by ${req.user.email}`,
                createdBy: req.user.email,
                createdByRole: req.user.role
            });

            await warrantyActivation.save();
            console.log(`✅ Warranty auto-activated for VIN: ${vehicle.vin}`);

        } catch (warrantyError) {
            console.error('⚠️ Warning: Failed to auto-activate warranty:', warrantyError.message);
            // Không làm thất bại đăng ký xe nếu kích hoạt bảo hành thất bại
        }

        return responseHelper.success(res, {
            vehicle: {
                id: vehicle._id,
                vin: vehicle.vin,
                modelName: vehicle.modelName,
                manufacturer: vehicle.manufacturer,
                year: vehicle.year,
                ownerName: vehicle.ownerName,
                purchaseDate: vehicle.purchaseDate,
                serviceCenterName: vehicle.serviceCenterName,
                status: vehicle.status,
                qualityStatus: vehicle.qualityStatus
            },
            warranty: warrantyActivation ? {
                id: warrantyActivation._id,
                warrantyStatus: warrantyActivation.warrantyStatus,
                warrantyStartDate: warrantyActivation.warrantyStartDate,
                warrantyEndDate: warrantyActivation.warrantyEndDate,
                warrantyMonths: warrantyActivation.warrantyMonths,
                remainingDays: warrantyActivation.remainingDays
            } : null
        }, warrantyActivation ?
            `Đăng ký xe cho khách hàng ${ownerName} và kích hoạt bảo hành thành công` :
            `Đăng ký xe cho khách hàng ${ownerName} thành công (bảo hành chưa kích hoạt)`, 201);
    } catch (error) {
        console.error('❌ Error in registerVehicle:', error);
        return responseHelper.error(res, `Lỗi khi đăng ký xe: ${error.message}`, 500);
    }
};

/**
 * Lấy thông tin xe theo VIN
 */
const getVehicleByVIN = async (req, res) => {
    try {
        const { vin } = req.params;
        const cacheKey = `vehicles:vin:${normalizeVIN(vin)}`;

        initializeModels();

        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy thông tin xe thành công (từ cache)");
        }

        const vehicle = await Vehicle.findByVIN(vin);
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe với VIN này", 404);
        }

        await setCached(cacheKey, vehicle, 600);

        return responseHelper.success(res, vehicle, "Lấy thông tin xe thành công");
    } catch (error) {
        return responseHelper.error(res, "Lỗi khi lấy thông tin xe", 500);
    }
};

const getAllVehicles = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, serviceCenterCode } = req.query;
        const cacheKey = `vehicles:all:${page}:${limit}:${search || ''}:${status || ''}:${serviceCenterCode || ''}`;

        initializeModels();

        const cachedData = await getCached(cacheKey);
        if (cachedData) {
            return responseHelper.success(res, cachedData, "Lấy danh sách xe thành công (từ cache)");
        }

        let query = {};

        if (search) {
            query = queryHelper.buildSearchQuery(search, ['vin', 'ownerName', 'ownerPhone', 'modelName']);
        }

        if (status) {
            query.status = status;
        }

        if (serviceCenterCode) {
            query.serviceCenterCode = serviceCenterCode.toUpperCase();
        }

        const { skip, limitNum } = queryHelper.parsePagination({ page, limit });

        const vehicles = await Vehicle.find(query)
            .select("vin modelName modelCode manufacturer year color ownerName ownerPhone serviceCenterName status registrationDate")
            .sort({ registrationDate: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Vehicle.countDocuments(query);
        const pagination = responseHelper.createPagination(page, limit, total);

        const result = { vehicles, pagination };

        await setCached(cacheKey, result, 300);

        return responseHelper.success(res, result, "Lấy danh sách xe thành công");
    } catch (error) {
        return responseHelper.error(res, "Lỗi khi lấy danh sách xe", 500);
    }
};

const updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        initializeModels();

        delete updateData.vin;
        delete updateData.createdBy;
        delete updateData.registeredBy;

        updateData.updatedBy = req.user.email;

        const vehicle = await Vehicle.findByIdAndUpdate(id, updateData, { new: true });
        if (!vehicle) {
            return responseHelper.error(res, "Không tìm thấy xe", 404);
        }

        await clearCachePatterns(["vehicles:*"]);

        return responseHelper.success(res, vehicle, "Cập nhật thông tin xe thành công");
    } catch (error) {
        return responseHelper.error(res, "Lỗi khi cập nhật xe", 500);
    }
};

const searchVehicles = async (req, res) => {
    try {
        const { q, type = 'all', page = 1, limit = 10 } = req.query;

        if (!q) {
            return responseHelper.error(res, "Thiếu từ khóa tìm kiếm", 400);
        }

        initializeModels();

        let query = {};

        switch (type) {
            case 'vin':
                query.vin = { $regex: q, $options: 'i' };
                break;
            case 'owner':
                query.$or = [
                    { ownerName: { $regex: q, $options: 'i' } },
                    { ownerPhone: { $regex: q, $options: 'i' } }
                ];
                break;
            case 'model':
                query.$or = [
                    { modelName: { $regex: q, $options: 'i' } },
                    { modelCode: { $regex: q, $options: 'i' } }
                ];
                break;
            default:
                query = queryHelper.buildSearchQuery(q, ['vin', 'ownerName', 'ownerPhone', 'modelName', 'modelCode']);
        }

        const { skip, limitNum } = queryHelper.parsePagination({ page, limit });

        const vehicles = await Vehicle.find(query)
            .select("vin modelName modelCode manufacturer year color ownerName ownerPhone serviceCenterName status")
            .sort({ registrationDate: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Vehicle.countDocuments(query);
        const pagination = responseHelper.createPagination(page, limit, total);

        return responseHelper.success(res, { vehicles, pagination }, "Tìm kiếm xe thành công");
    } catch (error) {
        return responseHelper.error(res, "Lỗi khi tìm kiếm xe", 500);
    }
};

const getVehicleStatistics = async (req, res) => {
    try {
        const cacheKey = 'vehicle_statistics';

        const cachedStats = await getCached(cacheKey);
        if (cachedStats) {
            return responseHelper.success(res, cachedStats, 'Thống kê xe (từ cache)');
        }

        const totalVehicles = await Vehicle.countDocuments();
        const activeVehicles = await Vehicle.countDocuments({ status: 'active' });
        const inactiveVehicles = await Vehicle.countDocuments({ status: 'inactive' });

        const brandStats = await Vehicle.aggregate([
            { $group: { _id: '$manufacturer', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const yearStats = await Vehicle.aggregate([
            { $group: { _id: '$year', count: { $sum: 1 } } },
            { $sort: { _id: -1 } }
        ]);

        const statistics = {
            totalVehicles,
            activeVehicles,
            inactiveVehicles,
            brandDistribution: brandStats,
            yearDistribution: yearStats,
            lastUpdated: new Date()
        };

        await setCached(cacheKey, statistics, 300);

        responseHelper.success(res, statistics, 'Lấy thống kê xe thành công');
    } catch (error) {
        responseHelper.error(res, 'Lỗi khi lấy thống kê xe', 500);
    }
};

module.exports = {
    initializeModels,
    registerVehicle,
    getVehicleByVIN,
    getAllVehicles,
    updateVehicle,
    searchVehicles,
    getVehicleStatistics
};