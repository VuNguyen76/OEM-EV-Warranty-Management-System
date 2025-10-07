const responseHelper = require('../../shared/utils/responseHelper');
const WarrantyActivationModel = require('../Model/WarrantyActivation');

/**
 * Lấy thông tin bảo hành theo VIN
 */
const getWarrantyByVIN = async (req, res) => {
    try {
        const { vin } = req.params;
        const vinUpper = vin.toUpperCase();

        const WarrantyActivation = WarrantyActivationModel();
        const warranty = await WarrantyActivation.findOne({ vin: vinUpper });

        if (!warranty) {
            return responseHelper.error(res, "Không tìm thấy bảo hành cho VIN này", 404);
        }

        return responseHelper.success(res, {
            warranty: warranty
        });

    } catch (error) {
        console.error('Error in getWarrantyByVIN:', error);
        return responseHelper.error(res, "Lỗi khi lấy thông tin bảo hành", 500);
    }
};

/**
 * Lấy danh sách bảo hành theo service center
 */
const getWarrantiesByServiceCenter = async (req, res) => {
    try {
        const serviceCenterId = req.user.sub;

        const WarrantyActivation = WarrantyActivationModel();
        const warranties = await WarrantyActivation.find({ serviceCenterId });

        return responseHelper.success(res, {
            warranties: warranties,
            count: warranties.length
        });

    } catch (error) {
        console.error('Error in getWarrantiesByServiceCenter:', error);
        return responseHelper.error(res, "Lỗi khi lấy danh sách bảo hành", 500);
    }
};

/**
 * Kiểm tra trạng thái bảo hành
 */
const checkWarrantyStatus = async (req, res) => {
    try {
        const { vin } = req.params;
        const vinUpper = vin.toUpperCase();

        const WarrantyActivation = WarrantyActivationModel();
        const warranty = await WarrantyActivation.findActiveByVIN(vinUpper);

        if (!warranty) {
            return responseHelper.success(res, {
                hasWarranty: false,
                message: "VIN này không có bảo hành hoạt động"
            });
        }

        return responseHelper.success(res, {
            hasWarranty: true,
            warranty: warranty,
            isValid: warranty.isValid,
            remainingDays: warranty.remainingDays
        });

    } catch (error) {
        console.error('Error in checkWarrantyStatus:', error);
        return responseHelper.error(res, "Lỗi khi kiểm tra trạng thái bảo hành", 500);
    }
};

module.exports = {
    getWarrantyByVIN,
    getWarrantiesByServiceCenter,
    checkWarrantyStatus
};