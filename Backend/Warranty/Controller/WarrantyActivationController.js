const responseHelper = require('../../shared/helpers/responseHelper');
const WarrantyActivation = require('../Model/WarrantyActivation')();
const axios = require('axios');

/**
 * WarrantyActivationController
 * Handles warranty activation (one-time activation when vehicle is sold)
 * Separate from WarrantyClaim (UC4 - multiple claims during warranty period)
 */
class WarrantyActivationController {
    
    /**
     * Activate warranty for a vehicle (one-time only)
     * Vehicle must already exist in Vehicle Service (UC1)
     */
    static async activateWarranty(req, res) {
        try {
            const { vin, warrantyStartDate, notes } = req.body;

            // Validate required fields
            if (!vin) {
                return responseHelper.error(res, "VIN là bắt buộc", 400);
            }

            const vinUpper = vin.toUpperCase();

            // Step 1: Check if warranty already activated for this VIN
            const existingWarranty = await WarrantyActivation.findOne({ vin: vinUpper });
            if (existingWarranty) {
                return responseHelper.error(res, "VIN này đã được kích hoạt bảo hành", 400);
            }

            // Step 2: Verify VIN exists in Vehicle Service
            const vehicleServiceUrl = process.env.VEHICLE_SERVICE_URL || 'http://warranty_vehicle_service:3004';
            let vehicleData = null;
            
            try {
                const authToken = req.headers.authorization?.replace('Bearer ', '');
                const headers = {};
                if (authToken) {
                    headers.Authorization = `Bearer ${authToken}`;
                }
                
                const response = await axios.get(`${vehicleServiceUrl}/vin/${vinUpper}`, { headers });
                vehicleData = response.data.data;
                
                if (!vehicleData) {
                    return responseHelper.error(res, "VIN không tồn tại trong hệ thống. Vui lòng đăng ký xe trước (UC1)", 400);
                }
            } catch (error) {
                console.error('❌ Error verifying VIN in Vehicle Service:', error.message);
                return responseHelper.error(res, "Không thể xác minh VIN trong hệ thống xe. Vui lòng đăng ký xe trước (UC1)", 400);
            }

            // Step 3: Get warranty period from model code
            let warrantyMonths = 36; // Default fallback
            let warrantySource = 'default';

            if (vehicleData.modelCode) {
                try {
                    const VehicleModel = require('../../Manufacturing/Model/VehicleModel')();
                    const model = await VehicleModel.findOne({ modelCode: vehicleData.modelCode.toUpperCase() });
                    
                    if (model && model.vehicleWarrantyMonths) {
                        warrantyMonths = model.vehicleWarrantyMonths;
                        warrantySource = `model:${vehicleData.modelCode}`;
                    }
                } catch (error) {
                    console.error('❌ Error fetching warranty period from Manufacturing DB:', error);
                    // Continue with default warranty period
                }
            }

            // Step 4: Calculate warranty dates
            const startDate = warrantyStartDate ? new Date(warrantyStartDate) : new Date();
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + warrantyMonths);

            // Step 5: Create warranty activation
            const warrantyActivation = new WarrantyActivation({
                vin: vinUpper,
                warrantyStartDate: startDate,
                warrantyEndDate: endDate,
                warrantyMonths: warrantyMonths,
                warrantySource: warrantySource,
                warrantyStatus: 'active',
                
                // Service center information (who activated the warranty)
                serviceCenterId: req.user.sub,
                serviceCenterName: `Service Center ${req.user.sub}`,
                serviceCenterCode: `SC-${req.user.sub.slice(-6)}`,
                
                // Activation information
                activatedBy: req.user.email,
                activatedByRole: req.user.role,
                activatedDate: new Date(),
                
                // Additional information
                notes: notes || '',
                
                // System fields
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
                activatedBy: warrantyActivation.activatedBy,
                activatedDate: warrantyActivation.activatedDate,
                remainingDays: warrantyActivation.remainingDays,
                isValid: warrantyActivation.isValid
            }, "Kích hoạt bảo hành thành công", 201);
            
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

            const warranty = await WarrantyActivation.findOne({ vin: vin.toUpperCase() });
            
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
                vin: vin.toUpperCase(),
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
