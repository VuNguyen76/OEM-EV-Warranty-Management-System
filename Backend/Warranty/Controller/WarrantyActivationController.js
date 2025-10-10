const responseHelper = require('../../shared/utils/responseHelper');
const WarrantyActivation = require('../Model/WarrantyActivation')();
const { verifyVINInVehicleService, normalizeVIN } = require('../../shared/services/VehicleServiceHelper');

/**
 * WarrantyActivationController
 * Xử lý kích hoạt bảo hành (kích hoạt một lần khi xe được bán)
 * Tách biệt với WarrantyClaim (UC4 - nhiều yêu cầu bảo hành trong thời gian bảo hành)
 */
class WarrantyActivationController {

    /**
     * Kích hoạt bảo hành cho xe (chỉ một lần)
     * Xe phải đã tồn tại trong Vehicle Service (UC1)
     * 
     * LUỒNG: Khách hàng đến Trung tâm dịch vụ → Nhân viên kích hoạt bảo hành thay khách hàng
     * Actor: Nhân viên trung tâm dịch vụ (không phải khách hàng)
     */
    static async activateWarranty(req, res) {
        try {
            const { vin, warrantyStartDate, notes } = req.body;

            // Kiểm tra các trường bắt buộc
            if (!vin) {
                return responseHelper.error(res, "VIN là bắt buộc", 400);
            }

            const vinUpper = normalizeVIN(vin);

            // Bước 1: Kiểm tra bảo hành đã được kích hoạt cho VIN này chưa
            const existingWarranty = await WarrantyActivation.findOne({ vin: vinUpper });
            if (existingWarranty) {
                return responseHelper.error(res, "VIN này đã được kích hoạt bảo hành", 400);
            }

            // Bước 2: Xác minh VIN tồn tại trong Vehicle Service
            let vehicleData;
            try {
                vehicleData = await verifyVINInVehicleService(vin, req.headers.authorization);
            } catch (error) {
                if (error.message === 'VEHICLE_NOT_FOUND') {
                    return responseHelper.error(res, "VIN không tồn tại trong hệ thống. Vui lòng đăng ký xe trước", 404);
                }
                return responseHelper.error(res, "Không thể xác minh VIN trong hệ thống xe. Vui lòng đăng ký xe trước", 400);
            }

            // Bước 3: Lấy thời gian bảo hành từ dữ liệu xe
            if (!vehicleData.vehicleWarrantyMonths) {
                return responseHelper.error(res, "Xe này không có thông tin thời gian bảo hành. Vui lòng liên hệ hãng sản xuất", 400);
            }

            const warrantyMonths = vehicleData.vehicleWarrantyMonths;
            const warrantySource = `model:${vehicleData.modelCode}`;

            // Bước 4: Tính toán ngày bảo hành
            const startDate = warrantyStartDate ? new Date(warrantyStartDate) : new Date();
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + warrantyMonths);

            // Bước 5: Lấy thông tin trung tâm dịch vụ nhất quán
            const VINLookupService = require('../../Vehicle/services/VINLookupService');
            const serviceCenterInfo = await VINLookupService.getServiceCenterInfo(req.user.serviceCenterId || req.user.sub);

            // Bước 6: Tạo warranty activation
            const warrantyActivation = new WarrantyActivation({
                vin: vinUpper,
                warrantyStartDate: startDate,
                warrantyEndDate: endDate,
                warrantyMonths: warrantyMonths,
                warrantySource: warrantySource,
                warrantyStatus: 'active',

                // Thông tin trung tâm dịch vụ (nhất quán với Vehicle model)
                serviceCenterId: serviceCenterInfo.id,
                serviceCenterName: serviceCenterInfo.name,
                serviceCenterCode: serviceCenterInfo.code,

                // Thông tin kích hoạt
                activatedBy: req.user.email,
                activatedByRole: req.user.role,
                activatedDate: new Date(),

                // Thông tin bổ sung
                notes: notes || '',

                // Các trường hệ thống
                createdBy: req.user.email,
                createdByRole: req.user.role
            });

            await warrantyActivation.save();

            return responseHelper.success(res, {
                id: warrantyActivation._id,
                vin: warrantyActivation.vin,
                warrantyStatus: warrantyActivation.warrantyStatus,
                warrantyStartDate: warrantyActivation.warrantyStartDate,
                warrantyEndDate: warrantyActivation.warrantyEndDate,
                warrantyMonths: warrantyActivation.warrantyMonths,
                warrantySource: warrantyActivation.warrantySource,
                serviceCenterName: warrantyActivation.serviceCenterName,
                activatedBy: warrantyActivation.activatedBy, // Nhân viên đã kích hoạt
                activatedDate: warrantyActivation.activatedDate,
                remainingDays: warrantyActivation.remainingDays,
                isValid: warrantyActivation.isValid
            }, `Kích hoạt bảo hành thành công bởi ${req.user.email}`, 201);

        } catch (error) {
            console.error('Lỗi trong activateWarranty:', error);
            return responseHelper.error(res, "Lỗi khi kích hoạt bảo hành", 500);
        }
    }

    /**
     * Lấy thông tin kích hoạt bảo hành theo VIN
     */
    static async getWarrantyByVIN(req, res) {
        try {
            const { vin } = req.params;

            if (!vin) {
                return responseHelper.error(res, "VIN là bắt buộc", 400);
            }

            const warranty = await WarrantyActivation.findOne({ vin: normalizeVIN(vin) });

            if (!warranty) {
                return responseHelper.error(res, "Không tìm thấy thông tin bảo hành cho VIN này", 404);
            }

            return responseHelper.success(res, {
                id: warranty._id,
                vin: warranty.vin,
                warrantyStatus: warranty.warrantyStatus,
                warrantyStartDate: warranty.warrantyStartDate,
                warrantyEndDate: warranty.warrantyEndDate,
                warrantyMonths: warranty.warrantyMonths,
                warrantySource: warranty.warrantySource,
                serviceCenterName: warranty.serviceCenterName,
                activatedBy: warranty.activatedBy,
                activatedDate: warranty.activatedDate,
                remainingDays: warranty.remainingDays,
                isValid: warranty.isValid,
                notes: warranty.notes
            }, "Lấy thông tin bảo hành thành công");

        } catch (error) {
            console.error('Lỗi trong getWarrantyByVIN:', error);
            return responseHelper.error(res, "Lỗi khi lấy thông tin bảo hành", 500);
        }
    }

    /**
     * Lấy tất cả kích hoạt bảo hành theo trung tâm dịch vụ
     */
    static async getWarrantiesByServiceCenter(req, res) {
        try {
            const serviceCenterId = req.user.sub;
            const { status, page = 1, limit = 10 } = req.query;

            const query = { serviceCenterId };
            if (status) {
                query.warrantyStatus = status;
            }

            const skip = (page - 1) * limit;

            const warranties = await WarrantyActivation.find(query)
                .sort({ activatedDate: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await WarrantyActivation.countDocuments(query);

            return responseHelper.success(res, {
                warranties: warranties.map(w => ({
                    id: w._id,
                    vin: w.vin,
                    warrantyStatus: w.warrantyStatus,
                    warrantyStartDate: w.warrantyStartDate,
                    warrantyEndDate: w.warrantyEndDate,
                    warrantyMonths: w.warrantyMonths,
                    activatedDate: w.activatedDate,
                    remainingDays: w.remainingDays,
                    isValid: w.isValid
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            }, "Lấy danh sách bảo hành thành công");

        } catch (error) {
            console.error('Lỗi trong getWarrantiesByServiceCenter:', error);
            return responseHelper.error(res, "Lỗi khi lấy danh sách bảo hành", 500);
        }
    }

    /**
     * Kiểm tra xem VIN có bảo hành đang hoạt động không
     */
    static async checkWarrantyStatus(req, res) {
        try {
            const { vin } = req.params;

            if (!vin) {
                return responseHelper.error(res, "VIN là bắt buộc", 400);
            }

            const hasWarranty = await WarrantyActivation.hasWarranty(vin);
            const warranty = await WarrantyActivation.findActiveByVIN(vin);

            return responseHelper.success(res, {
                vin: normalizeVIN(vin),
                hasActiveWarranty: !!hasWarranty,
                warranty: warranty ? {
                    id: warranty._id,
                    warrantyStatus: warranty.warrantyStatus,
                    warrantyEndDate: warranty.warrantyEndDate,
                    remainingDays: warranty.remainingDays,
                    isValid: warranty.isValid
                } : null
            }, "Kiểm tra trạng thái bảo hành thành công");

        } catch (error) {
            console.error('Lỗi trong checkWarrantyStatus:', error);
            return responseHelper.error(res, "Lỗi khi kiểm tra trạng thái bảo hành", 500);
        }
    }
}

module.exports = WarrantyActivationController;
