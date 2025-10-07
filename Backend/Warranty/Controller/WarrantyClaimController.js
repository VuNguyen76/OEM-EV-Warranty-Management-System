const axios = require('axios');
const responseHelper = require('../../shared/utils/responseHelper');
const WarrantyClaimModel = require('../Model/WarrantyClaim');
const WarrantyActivationModel = require('../Model/WarrantyActivation');
const { generateFileUrl, deleteFile } = require('../../shared/middleware/MulterMiddleware');

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

        // Validate required fields
        if (mileage === undefined || mileage === null) {
            return responseHelper.error(res, "Mileage là bắt buộc", 400);
        }

        // Step 5: Create warranty claim
        const warrantyClaim = new WarrantyClaim({
            claimNumber,
            vin: vinUpper,
            warrantyActivationId: warrantyActivation._id,
            issueDescription,
            issueCategory,
            partsToReplace: partsToReplace || [],
            diagnosis: diagnosis || '',
            mileage,
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
            fileUrl: generateFileUrl(req, file.filename),
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
        const warrantyClaim = await WarrantyClaim.findById(claimId);
        // .populate('warrantyActivationId'); // TODO: Fix WarrantyActivation model registration

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

/**
 * UC6: Theo Dõi Trạng Thái Yêu Cầu
 * - Lấy lịch sử thay đổi trạng thái của claim
 */
const getClaimStatusHistory = async (req, res) => {
    try {
        const { claimId } = req.params;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId).select('claimNumber vin claimStatus statusHistory');

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Sort status history by date (newest first)
        const statusHistory = claim.statusHistory || [];
        const sortedHistory = statusHistory.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            vin: claim.vin,
            currentStatus: claim.claimStatus,
            statusHistory: sortedHistory,
            totalStatusChanges: sortedHistory.length
        }, "Lấy lịch sử trạng thái thành công");

    } catch (error) {
        console.error('Error getting claim status history:', error);
        return responseHelper.error(res, "Lỗi server khi lấy lịch sử trạng thái", 500);
    }
};

/**
 * UC7: Phê Duyệt/Từ Chối Yêu Cầu
 * - Phê duyệt claim với validation business logic
 */
const approveWarrantyClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { approvalNotes } = req.body;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Business logic validation
        if (claim.claimStatus !== 'under_review') {
            return responseHelper.error(res, "Chỉ có thể phê duyệt claim đang ở trạng thái 'under_review'", 400);
        }

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Claim approved by reviewer';
        claim._statusChangeNotes = approvalNotes || 'Claim has been approved for processing';

        // Update status to approved
        claim.claimStatus = 'approved';
        claim.approvedAt = new Date();
        claim.approvedBy = req.user.email;

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: 'approved',
            approvedBy: req.user.email,
            approvedAt: claim.approvedAt,
            approvalNotes: approvalNotes || 'Claim has been approved for processing'
        }, "Phê duyệt yêu cầu bảo hành thành công");

    } catch (error) {
        console.error('Error approving warranty claim:', error);
        return responseHelper.error(res, "Lỗi server khi phê duyệt yêu cầu", 500);
    }
};

/**
 * UC7: Phê Duyệt/Từ Chối Yêu Cầu
 * - Từ chối claim với lý do bắt buộc
 */
const rejectWarrantyClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { rejectionReason, rejectionNotes } = req.body;

        // Validation
        if (!rejectionReason || rejectionReason.trim().length === 0) {
            return responseHelper.error(res, "Lý do từ chối là bắt buộc", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Business logic validation
        if (claim.claimStatus !== 'under_review') {
            return responseHelper.error(res, "Chỉ có thể từ chối claim đang ở trạng thái 'under_review'", 400);
        }

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = rejectionReason;
        claim._statusChangeNotes = rejectionNotes || '';

        // Update status to rejected
        claim.claimStatus = 'rejected';
        claim.rejectedAt = new Date();
        claim.rejectedBy = req.user.email;
        claim.rejectionReason = rejectionReason;

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: 'rejected',
            rejectedBy: req.user.email,
            rejectedAt: claim.rejectedAt,
            rejectionReason: rejectionReason,
            rejectionNotes: rejectionNotes || ''
        }, "Từ chối yêu cầu bảo hành thành công");

    } catch (error) {
        console.error('Error rejecting warranty claim:', error);
        return responseHelper.error(res, "Lỗi server khi từ chối yêu cầu", 500);
    }
};

/**
 * UC7: Phê Duyệt/Từ Chối Yêu Cầu
 * - Lấy danh sách claims cần phê duyệt
 */
const getClaimsForApproval = async (req, res) => {
    try {
        const { page = 1, limit = 10, priority } = req.query;
        const skip = (page - 1) * limit;

        const WarrantyClaim = WarrantyClaimModel();

        // Filter for claims under review
        let filter = { claimStatus: 'under_review' };

        // Optional priority filter
        if (priority) {
            filter.priority = priority;
        }

        const claims = await WarrantyClaim.find(filter)
            .select('claimNumber vin customerName issueDescription priority createdAt estimatedCost')
            .sort({ priority: -1, createdAt: 1 }) // High priority first, then oldest first
            .skip(skip)
            .limit(parseInt(limit));

        const totalClaims = await WarrantyClaim.countDocuments(filter);

        return responseHelper.success(res, {
            claims,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalClaims / limit),
                totalClaims,
                hasNextPage: page * limit < totalClaims,
                hasPrevPage: page > 1
            }
        }, "Lấy danh sách claims cần phê duyệt thành công");

    } catch (error) {
        console.error('Error getting claims for approval:', error);
        return responseHelper.error(res, "Lỗi server khi lấy danh sách claims", 500);
    }
};

/**
 * UC7: Phê Duyệt/Từ Chối Yêu Cầu
 * - Thêm ghi chú cho claim
 */
const addApprovalNotes = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { notes } = req.body;

        if (!notes || notes.trim().length === 0) {
            return responseHelper.error(res, "Ghi chú không được để trống", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Initialize approvalNotes array if it doesn't exist
        if (!claim.approvalNotes) {
            claim.approvalNotes = [];
        }

        // Add new note
        claim.approvalNotes.push({
            note: notes.trim(),
            addedBy: req.user.email,
            addedAt: new Date()
        });

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            noteAdded: {
                note: notes.trim(),
                addedBy: req.user.email,
                addedAt: new Date()
            },
            totalNotes: claim.approvalNotes.length
        }, "Thêm ghi chú thành công");

    } catch (error) {
        console.error('Error adding approval notes:', error);
        return responseHelper.error(res, "Lỗi server khi thêm ghi chú", 500);
    }
};

module.exports = {
    createWarrantyClaim,
    addClaimAttachment,
    getClaimById,
    getClaimsByVIN,
    getClaimsByServiceCenter,
    getClaimStatusHistory,
    // UC7: Approval/Rejection methods
    approveWarrantyClaim,
    rejectWarrantyClaim,
    getClaimsForApproval,
    addApprovalNotes
};
