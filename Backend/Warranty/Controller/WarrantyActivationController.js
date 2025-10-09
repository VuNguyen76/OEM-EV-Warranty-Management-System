const responseHelper = require('../../shared/utils/responseHelper');
const WarrantyActivation = require('../Model/WarrantyActivation')();
const { verifyVINInVehicleService, normalizeVIN } = require('../../shared/services/VehicleServiceHelper');

/**
 * WarrantyActivationController
 * Handles warranty activation (one-time activation when vehicle is sold)
 * Separate from WarrantyClaim (UC4 - multiple claims during warranty period)
 */
class WarrantyActivationController {

    /**
     * Activate warranty for a vehicle (one-time only)
     * Vehicle must already exist in Vehicle Service (UC1)
     * 
     * FLOW: Customer comes to Service Center → Staff activates warranty on behalf of customer
     * Actor: Service Center Staff (not customer)
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
                    return responseHelper.error(res, "VIN không tồn tại trong hệ thống. Vui lòng đăng ký xe trước (UC1)", 404);
                }
                return responseHelper.error(res, "Không thể xác minh VIN trong hệ thống xe. Vui lòng đăng ký xe trước (UC1)", 400);
            }

            // Step 3: Get warranty period from vehicle data
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
            console.error('Error in activateWarranty:', error);
            return responseHelper.error(res, "Lỗi khi kích hoạt bảo hành", 500);
        }
    }

    /**
     * Get warranty activation by VIN
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
            console.error('Error in getWarrantyByVIN:', error);
            return responseHelper.error(res, "Lỗi khi lấy thông tin bảo hành", 500);
        }
    }

    /**
     * Get all warranty activations by service center
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
            console.error('Error in getWarrantiesByServiceCenter:', error);
            return responseHelper.error(res, "Lỗi khi lấy danh sách bảo hành", 500);
        }
    }

    /**
     * Check if VIN has active warranty
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
            console.error('Error in checkWarrantyStatus:', error);
            return responseHelper.error(res, "Lỗi khi kiểm tra trạng thái bảo hành", 500);
        }
    }
}

module.exports = WarrantyActivationController;
