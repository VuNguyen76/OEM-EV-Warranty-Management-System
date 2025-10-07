const axios = require('axios');
const responseHelper = require('../../shared/utils/responseHelper');
const WarrantyClaimModel = require('../Model/WarrantyClaim');
const WarrantyActivationModel = require('../Model/WarrantyActivation');

// Service URLs
const vehicleServiceUrl = process.env.VEHICLE_SERVICE_URL || 'http://host.docker.internal:3004';

/**
 * UC4: Tạo Yêu Cầu Bảo Hành
 * - Chọn xe cần bảo hành (VIN đã có warranty)
 * - Mô tả vấn đề/lỗi
 * - Chọn phụ tùng cần thay thế
 * - Nhập thông tin chẩn đoán
 * - Gửi yêu cầu lên hãng
 * - NHIỀU LẦN trong warranty period
 */
const createWarrantyClaim = async (req, res) => {
    try {
        const {
            vin,
            issueDescription,
            issueCategory,
            partsToReplace,
            diagnosis,
            mileage,
            priority,
            requestedBy,
            notes
        } = req.body;

        // Validate required fields
        if (!vin) {
            return responseHelper.error(res, "VIN là bắt buộc", 400);
        }
        if (!issueDescription) {
            return responseHelper.error(res, "Mô tả vấn đề là bắt buộc", 400);
        }
        if (!issueCategory) {
            return responseHelper.error(res, "Loại vấn đề là bắt buộc", 400);
        }

        const vinUpper = vin.toUpperCase();

        // Step 1: Verify VIN has active warranty
        const WarrantyActivation = WarrantyActivationModel();
        const warrantyActivation = await WarrantyActivation.findOne({ 
            vin: vinUpper, 
            warrantyStatus: 'active' 
        });

        if (!warrantyActivation) {
            return responseHelper.error(res, "VIN này không có bảo hành hoạt động. Vui lòng kích hoạt bảo hành trước", 400);
        }

        // Step 2: Check if warranty is still valid
        const currentDate = new Date();
        if (currentDate > warrantyActivation.warrantyEndDate) {
            return responseHelper.error(res, "Bảo hành đã hết hạn", 400);
        }

        // Step 3: Verify VIN exists in Vehicle Service
        const headers = {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
        };

        let vehicleData;
        try {
            const response = await axios.get(`${vehicleServiceUrl}/vin/${vinUpper}`, { headers });
            vehicleData = response.data?.data;
        } catch (error) {
            console.error('Error fetching vehicle data:', error.message);
            return responseHelper.error(res, "Không thể xác minh thông tin xe", 500);
        }

        // Step 4: Generate claim number
        const currentYear = new Date().getFullYear();
        const WarrantyClaim = WarrantyClaimModel();
        
        // Get next claim number for this year
        const lastClaim = await WarrantyClaim.findOne({
            claimNumber: { $regex: `^WC-${currentYear}-` }
        }).sort({ claimNumber: -1 });

        let nextNumber = 1;
        if (lastClaim) {
            const lastNumber = parseInt(lastClaim.claimNumber.split('-')[2]);
            nextNumber = lastNumber + 1;
        }

        const claimNumber = `WC-${currentYear}-${nextNumber.toString().padStart(5, '0')}`;

        // Step 5: Create warranty claim
        const warrantyClaim = new WarrantyClaim({
            claimNumber,
            vin: vinUpper,
            warrantyActivationId: warrantyActivation._id,
            issueDescription,
            issueCategory,
            partsToReplace: partsToReplace || [],
            diagnosis: diagnosis || '',
            mileage: mileage || 0,
            priority: priority || 'medium',
            claimStatus: 'pending',
            serviceCenterId: req.user.sub,
            serviceCenterName: req.user.serviceCenterName || '',
            requestedBy: requestedBy || req.user.email,
            notes: notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await warrantyClaim.save();

        return responseHelper.success(res, {
            message: "Tạo yêu cầu bảo hành thành công",
            warrantyClaim: {
                claimId: warrantyClaim._id,
                claimNumber: warrantyClaim.claimNumber,
                vin: warrantyClaim.vin,
                claimStatus: warrantyClaim.claimStatus,
                issueDescription: warrantyClaim.issueDescription,
                issueCategory: warrantyClaim.issueCategory,
                partsToReplace: warrantyClaim.partsToReplace,
                priority: warrantyClaim.priority,
                createdAt: warrantyClaim.createdAt
            }
        }, 201);

    } catch (error) {
        console.error('Error in createWarrantyClaim:', error);
        return responseHelper.error(res, "Lỗi khi tạo yêu cầu bảo hành", 500);
    }
};

/**
 * UC5: Đính Kèm Báo Cáo Kiểm Tra
 * - Upload báo cáo kiểm tra kỹ thuật
 * - Đính kèm hình ảnh minh chứng
 * - Thêm ghi chú chẩn đoán
 * - Cập nhật yêu cầu
 */
const addClaimAttachment = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { notes, attachmentType } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return responseHelper.error(res, "Không có file nào được upload", 400);
        }

        // Step 1: Find warranty claim
        const WarrantyClaim = WarrantyClaimModel();
        const warrantyClaim = await WarrantyClaim.findById(claimId);

        if (!warrantyClaim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Step 2: Check permission (only claim creator or admin can add attachments)
        if (warrantyClaim.serviceCenterId !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền thêm attachment cho yêu cầu này", 403);
        }

        // Step 3: Process uploaded files
        const attachments = files.map(file => ({
            fileName: file.originalname,
            fileUrl: `/uploads/warranty-claims/${claimId}/${file.filename}`,
            fileType: file.mimetype,
            uploadedAt: new Date(),
            uploadedBy: req.user.email,
            attachmentType: attachmentType || 'inspection_report'
        }));

        // Step 4: Add attachments to claim
        warrantyClaim.attachments.push(...attachments);
        warrantyClaim.updatedAt = new Date();

        if (notes) {
            warrantyClaim.notes += `\n[${new Date().toISOString()}] ${req.user.email}: ${notes}`;
        }

        await warrantyClaim.save();

        return responseHelper.success(res, {
            message: "Đính kèm file thành công",
            attachments: attachments,
            claimId: warrantyClaim._id,
            claimNumber: warrantyClaim.claimNumber
        });

    } catch (error) {
        console.error('Error in addClaimAttachment:', error);
        return responseHelper.error(res, "Lỗi khi đính kèm file", 500);
    }
};

// Get claim by ID
const getClaimById = async (req, res) => {
    try {
        const { claimId } = req.params;

        const WarrantyClaim = WarrantyClaimModel();
        const warrantyClaim = await WarrantyClaim.findById(claimId)
            .populate('warrantyActivationId');

        if (!warrantyClaim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        return responseHelper.success(res, {
            warrantyClaim
        });

    } catch (error) {
        console.error('Error in getClaimById:', error);
        return responseHelper.error(res, "Lỗi khi lấy thông tin yêu cầu bảo hành", 500);
    }
};

// Get claims by VIN
const getClaimsByVIN = async (req, res) => {
    try {
        const { vin } = req.params;
        const vinUpper = vin.toUpperCase();

        const WarrantyClaim = WarrantyClaimModel();
        const warrantyClaims = await WarrantyClaim.find({ vin: vinUpper })
            .sort({ createdAt: -1 });

        return responseHelper.success(res, {
            warrantyClaims,
            total: warrantyClaims.length
        });

    } catch (error) {
        console.error('Error in getClaimsByVIN:', error);
        return responseHelper.error(res, "Lỗi khi lấy danh sách yêu cầu bảo hành", 500);
    }
};

// Get claims by service center
const getClaimsByServiceCenter = async (req, res) => {
    try {
        const serviceCenterId = req.user.sub;

        const WarrantyClaim = WarrantyClaimModel();
        const warrantyClaims = await WarrantyClaim.find({ serviceCenterId })
            .sort({ createdAt: -1 });

        return responseHelper.success(res, {
            warrantyClaims,
            total: warrantyClaims.length
        });

    } catch (error) {
        console.error('Error in getClaimsByServiceCenter:', error);
        return responseHelper.error(res, "Lỗi khi lấy danh sách yêu cầu bảo hành", 500);
    }
};

module.exports = {
    createWarrantyClaim,
    addClaimAttachment,
    getClaimById,
    getClaimsByVIN,
    getClaimsByServiceCenter
};
