const responseHelper = require('../../shared/utils/responseHelper');
const WarrantyClaimModel = require('../Model/WarrantyClaim');
const WarrantyActivationModel = require('../Model/WarrantyActivation');
const { generateFileUrl } = require('../../shared/middleware/MulterMiddleware');
const { verifyVINInVehicleService, normalizeVIN } = require('../../shared/services/VehicleServiceHelper');

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

        // ✅ UC4 VALIDATION: Required fields
        if (!vin) {
            return responseHelper.error(res, "VIN là bắt buộc", 400);
        }
        if (!issueDescription) {
            return responseHelper.error(res, "Mô tả vấn đề là bắt buộc", 400);
        }
        if (!issueCategory) {
            return responseHelper.error(res, "Loại vấn đề là bắt buộc", 400);
        }

        const vinUpper = normalizeVIN(vin);

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
        try {
            await verifyVINInVehicleService(vin, req.headers.authorization);
        } catch (error) {
            if (error.message === 'VEHICLE_NOT_FOUND') {
                return responseHelper.error(res, "Không tìm thấy xe với VIN này", 404);
            }
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
            serviceCenterId: req.user.serviceCenterId || req.user.sub, // ✅ Use serviceCenterId from JWT
            serviceCenterName: req.user.serviceCenterName || 'Unknown Service Center',
            serviceCenterCode: req.user.serviceCenterCode || 'UNKNOWN',
            requestedBy: requestedBy || req.user.email,
            notes: notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await warrantyClaim.save();

        return responseHelper.success(res, {
            warrantyClaim: {
                claimId: warrantyClaim._id,
                claimNumber: warrantyClaim.claimNumber,
                vin: warrantyClaim.vin,
                claimStatus: warrantyClaim.claimStatus,
                issueDescription: warrantyClaim.issueDescription,
                issueCategory: warrantyClaim.issueCategory,
                partsToReplace: warrantyClaim.partsToReplace,
                diagnosis: warrantyClaim.diagnosis,
                mileage: warrantyClaim.mileage,
                priority: warrantyClaim.priority,
                serviceCenterName: warrantyClaim.serviceCenterName,
                requestedBy: warrantyClaim.requestedBy,
                createdAt: warrantyClaim.createdAt
            },
            message: `Tạo yêu cầu bảo hành ${claimNumber} cho xe ${vinUpper} thành công`
        }, "UC4: Tạo yêu cầu bảo hành thành công", 201);

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

        // ✅ UC5 VALIDATION: Check files uploaded
        if (!files || files.length === 0) {
            return responseHelper.error(res, "Không có file nào được upload", 400);
        }

        // ✅ UC5 VALIDATION: Check file count (max 10 files per upload)
        if (files.length > 10) {
            return responseHelper.error(res, "Chỉ được upload tối đa 10 files mỗi lần", 400);
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

        // ✅ UC5 BUSINESS LOGIC: Check if claim is still editable
        if (warrantyClaim.isClosed) {
            return responseHelper.error(res, "Không thể thêm attachment cho yêu cầu đã đóng (completed/cancelled/rejected)", 400);
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

        // ✅ FIX: Safe notes concatenation
        if (notes) {
            const timestamp = new Date().toISOString();
            const noteEntry = `\n[${timestamp}] ${req.user.email}: ${notes}`;
            warrantyClaim.notes = (warrantyClaim.notes || '') + noteEntry;
        }

        await warrantyClaim.save();

        return responseHelper.success(res, {
            message: "Đính kèm file thành công",
            attachments: attachments,
            claimId: warrantyClaim._id,
            claimNumber: warrantyClaim.claimNumber,
            totalAttachments: warrantyClaim.attachments.length
        }, "UC5: Đính kèm báo cáo kiểm tra thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'addClaimAttachment', error, "Lỗi khi đính kèm file", 500, {
            claimId: req.params.claimId,
            filesCount: req.files?.length
        });
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
        const vinUpper = normalizeVIN(vin);

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
        const { page = 1, limit = 10, status } = req.query;

        const WarrantyClaim = WarrantyClaimModel();

        // Build query
        const query = { serviceCenterId };
        if (status) {
            query.claimStatus = status;
        }

        // ✅ PAGINATION: Support pagination for large claim lists
        const skip = (page - 1) * limit;
        const [warrantyClaims, total] = await Promise.all([
            WarrantyClaim.find(query)
                .select('claimNumber vin claimStatus issueCategory priority createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            WarrantyClaim.countDocuments(query)
        ]);

        return responseHelper.success(res, {
            warrantyClaims,
            pagination: {
                currentPage: parseInt(page),
                pageSize: parseInt(limit),
                totalItems: total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1
            }
        }, "Lấy danh sách yêu cầu bảo hành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getClaimsByServiceCenter', error, "Lỗi khi lấy danh sách yêu cầu bảo hành", 500, {
            serviceCenterId: req.user.sub
        });
    }
};

/**
 * UC6: Theo Dõi Trạng Thái Yêu Cầu
 * - Lấy lịch sử thay đổi trạng thái của claim
 */
const getClaimStatusHistory = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId)
            .select('claimNumber vin claimStatus statusHistory serviceCenterId');

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC6 PERMISSION CHECK: Only claim owner or admin can view status history
        if (claim.serviceCenterId !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền xem lịch sử trạng thái của yêu cầu này", 403);
        }

        // Sort status history by date (newest first)
        const statusHistory = claim.statusHistory || [];
        const sortedHistory = statusHistory.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

        // ✅ UC6 PAGINATION: Support pagination for large history
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedHistory = sortedHistory.slice(startIndex, endIndex);

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            vin: claim.vin,
            currentStatus: claim.claimStatus,
            statusHistory: paginatedHistory,
            pagination: {
                currentPage: parseInt(page),
                pageSize: parseInt(limit),
                totalItems: sortedHistory.length,
                totalPages: Math.ceil(sortedHistory.length / limit),
                hasNextPage: endIndex < sortedHistory.length,
                hasPrevPage: page > 1
            }
        }, "UC6: Lấy lịch sử trạng thái thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getClaimStatusHistory', error, "Lỗi server khi lấy lịch sử trạng thái", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC7: Phê Duyệt/Từ Chối Yêu Cầu
 * - Phê duyệt claim với validation business logic
 */
const approveWarrantyClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { approvalNotes, approvedCost } = req.body;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC7 BUSINESS LOGIC: Check claim status
        if (claim.claimStatus !== 'under_review') {
            return responseHelper.error(res, "Chỉ có thể phê duyệt claim đang ở trạng thái 'under_review'", 400);
        }

        // ✅ UC7 VALIDATION: Check warranty is still valid
        const WarrantyActivation = WarrantyActivationModel();
        const warranty = await WarrantyActivation.findOne({
            vin: claim.vin,
            warrantyStatus: 'active'
        });

        if (!warranty) {
            return responseHelper.error(res, "Không thể phê duyệt: Xe không có bảo hành hoạt động", 400);
        }

        if (new Date() > warranty.warrantyEndDate) {
            return responseHelper.error(res, "Không thể phê duyệt: Bảo hành đã hết hạn", 400);
        }

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Claim approved by reviewer';
        claim._statusChangeNotes = approvalNotes || 'Claim has been approved for processing';

        // Update status to approved
        claim.claimStatus = 'approved';
        claim.approvedAt = new Date();
        claim.approvedBy = req.user.email;

        if (approvedCost !== undefined) {
            claim.approvedCost = approvedCost;
        }

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: 'approved',
            approvedBy: req.user.email,
            approvedAt: claim.approvedAt,
            approvedCost: claim.approvedCost,
            approvalNotes: approvalNotes || 'Claim has been approved for processing'
        }, "UC7: Phê duyệt yêu cầu bảo hành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'approveWarrantyClaim', error, "Lỗi server khi phê duyệt yêu cầu", 500, {
            claimId: req.params.claimId
        });
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

        // ✅ UC7 VALIDATION: Rejection reason is required
        if (!rejectionReason || rejectionReason.trim().length === 0) {
            return responseHelper.error(res, "Lý do từ chối là bắt buộc", 400);
        }

        if (rejectionReason.trim().length < 10) {
            return responseHelper.error(res, "Lý do từ chối phải có ít nhất 10 ký tự", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC7 BUSINESS LOGIC: Check claim status
        if (claim.claimStatus !== 'under_review') {
            return responseHelper.error(res, "Chỉ có thể từ chối claim đang ở trạng thái 'under_review'", 400);
        }

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = rejectionReason.trim();
        claim._statusChangeNotes = rejectionNotes?.trim() || '';

        // Update status to rejected
        claim.claimStatus = 'rejected';
        claim.rejectedAt = new Date();
        claim.rejectedBy = req.user.email;
        claim.rejectionReason = rejectionReason.trim();

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: 'rejected',
            rejectedBy: req.user.email,
            rejectedAt: claim.rejectedAt,
            rejectionReason: rejectionReason.trim(),
            rejectionNotes: rejectionNotes?.trim() || ''
        }, "UC7: Từ chối yêu cầu bảo hành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'rejectWarrantyClaim', error, "Lỗi server khi từ chối yêu cầu", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC7: Phê Duyệt/Từ Chối Yêu Cầu
 * - Lấy danh sách claims cần phê duyệt
 */
const getClaimsForApproval = async (req, res) => {
    try {
        const { page = 1, limit = 10, priority, issueCategory } = req.query;
        const skip = (page - 1) * limit;

        const WarrantyClaim = WarrantyClaimModel();

        // ✅ UC7 FILTER: Claims under review
        let filter = { claimStatus: 'under_review' };

        // Optional filters
        if (priority) {
            filter.priority = priority;
        }

        if (issueCategory) {
            filter.issueCategory = issueCategory;
        }

        const [claims, totalClaims] = await Promise.all([
            WarrantyClaim.find(filter)
                .select('claimNumber vin issueDescription issueCategory priority createdAt partsToReplace serviceCenterName')
                .sort({ priority: -1, createdAt: 1 }) // High priority first, then oldest first
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            WarrantyClaim.countDocuments(filter)
        ]);

        // ✅ Calculate estimated cost for each claim
        const claimsWithCost = claims.map(claim => ({
            ...claim,
            estimatedTotalCost: (claim.partsToReplace || []).reduce((total, part) => {
                return total + (part.estimatedCost || 0) * part.quantity;
            }, 0)
        }));

        return responseHelper.success(res, {
            claims: claimsWithCost,
            pagination: {
                currentPage: parseInt(page),
                pageSize: parseInt(limit),
                totalItems: totalClaims,
                totalPages: Math.ceil(totalClaims / limit),
                hasNextPage: page * limit < totalClaims,
                hasPrevPage: page > 1
            }
        }, "UC7: Lấy danh sách claims cần phê duyệt thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getClaimsForApproval', error, "Lỗi server khi lấy danh sách claims", 500);
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

        // ✅ UC7 VALIDATION: Notes required
        if (!notes || notes.trim().length === 0) {
            return responseHelper.error(res, "Ghi chú không được để trống", 400);
        }

        if (notes.trim().length < 5) {
            return responseHelper.error(res, "Ghi chú phải có ít nhất 5 ký tự", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC7 PERMISSION: Only reviewers (service_staff, admin) can add approval notes
        if (!['service_staff', 'admin'].includes(req.user.role)) {
            return responseHelper.error(res, "Chỉ reviewer mới có thể thêm ghi chú phê duyệt", 403);
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
        }, "UC7: Thêm ghi chú phê duyệt thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'addApprovalNotes', error, "Lỗi server khi thêm ghi chú", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC9: Ship Parts - Confirm parts shipment for approved claim
 */
const shipParts = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { trackingNumber, shippedDate, parts } = req.body;

        // ✅ UC9 VALIDATION: Required fields
        if (!trackingNumber || trackingNumber.trim().length === 0) {
            return responseHelper.error(res, "Số tracking là bắt buộc", 400);
        }

        if (trackingNumber.trim().length < 5) {
            return responseHelper.error(res, "Số tracking phải có ít nhất 5 ký tự", 400);
        }

        if (!parts || !Array.isArray(parts) || parts.length === 0) {
            return responseHelper.error(res, "Danh sách phụ tùng là bắt buộc", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC9 BUSINESS LOGIC: Check claim status
        if (claim.claimStatus !== 'approved') {
            return responseHelper.error(res, "Chỉ có thể ship parts cho claim đã được phê duyệt", 400);
        }

        // ✅ UC9 VALIDATION: Validate parts match approved parts list
        for (const shipPart of parts) {
            if (!shipPart.partName || !shipPart.quantity) {
                return responseHelper.error(res, "Mỗi phụ tùng phải có partName và quantity", 400);
            }

            const approvedPart = claim.partsToReplace.find(p =>
                p.partName === shipPart.partName
            );

            if (!approvedPart) {
                return responseHelper.error(res, `Phụ tùng ${shipPart.partName} không có trong danh sách đã phê duyệt`, 400);
            }

            if (shipPart.quantity > approvedPart.quantity) {
                return responseHelper.error(res, `Số lượng ${shipPart.partName} vượt quá số đã phê duyệt`, 400);
            }
        }

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Parts shipped to service center';
        claim._statusChangeNotes = `Tracking: ${trackingNumber}`;

        // Update parts shipment info
        claim.partsShipment = {
            status: 'shipped',
            shippedDate: shippedDate ? new Date(shippedDate) : new Date(),
            trackingNumber: trackingNumber.trim(),
            parts: parts.map(part => ({
                partId: part.partId,
                partName: part.partName.trim(),
                quantity: part.quantity,
                serialNumber: part.serialNumber?.trim() || '',
                condition: 'good', // Default condition when shipped
                receivedQuantity: 0, // Will be updated when received
                notes: part.notes?.trim() || ''
            }))
        };

        // Update claim status
        claim.claimStatus = 'parts_shipped';

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: 'parts_shipped',
            trackingNumber: trackingNumber.trim(),
            shippedDate: claim.partsShipment.shippedDate,
            partsCount: parts.length
        }, "UC9: Phụ tùng đã được ship thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'shipParts', error, "Lỗi server khi ship phụ tùng", 500, {
            claimId: req.params.claimId,
            partsCount: req.body.parts?.length
        });
    }
};

/**
 * UC9: Receive Parts - Confirm parts receipt and quality check
 */
const receiveParts = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { receivedBy, parts, qualityCheckNotes } = req.body;

        // ✅ UC9 VALIDATION: Required fields
        if (!receivedBy || receivedBy.trim().length === 0) {
            return responseHelper.error(res, "Người nhận là bắt buộc", 400);
        }

        if (!parts || !Array.isArray(parts) || parts.length === 0) {
            return responseHelper.error(res, "Danh sách phụ tùng nhận được là bắt buộc", 400);
        }

        // ✅ UC9 VALIDATION: Validate each part
        const validConditions = ['good', 'damaged', 'defective'];
        for (const part of parts) {
            if (!part.partName) {
                return responseHelper.error(res, "Mỗi phụ tùng phải có partName", 400);
            }
            if (!part.condition || !validConditions.includes(part.condition)) {
                return responseHelper.error(res, `Condition phải là: ${validConditions.join(', ')}`, 400);
            }
            if (part.receivedQuantity === undefined || part.receivedQuantity < 0) {
                return responseHelper.error(res, "receivedQuantity phải >= 0", 400);
            }
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC9 BUSINESS LOGIC: Check claim status
        if (claim.claimStatus !== 'parts_shipped') {
            return responseHelper.error(res, "Chỉ có thể nhận parts cho claim đã được ship", 400);
        }

        // ✅ UC9 VALIDATION: Serial numbers must be unique
        const serialNumbers = parts.filter(p => p.serialNumber).map(p => p.serialNumber);
        const uniqueSerials = new Set(serialNumbers);
        if (serialNumbers.length !== uniqueSerials.size) {
            return responseHelper.error(res, "Số serial không được trùng lặp", 400);
        }

        // Check if any parts are damaged/defective
        const hasDefectiveParts = parts.some(part =>
            part.condition === 'damaged' || part.condition === 'defective'
        );

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = hasDefectiveParts ?
            'Parts received but some are defective' :
            'Parts received and quality checked';
        claim._statusChangeNotes = qualityCheckNotes || '';

        // Update parts shipment info
        claim.partsShipment.status = hasDefectiveParts ? 'rejected' : 'received';
        claim.partsShipment.receivedDate = new Date();
        claim.partsShipment.receivedBy = receivedBy;
        claim.partsShipment.qualityCheckNotes = qualityCheckNotes || '';

        // ✅ UC9 LOGIC: Update parts with received info (match by partName and validate)
        claim.partsShipment.parts = claim.partsShipment.parts.map(shipPart => {
            const receivedPart = parts.find(p => p.partName === shipPart.partName);
            if (receivedPart) {
                return {
                    ...shipPart,
                    serialNumber: receivedPart.serialNumber?.trim() || shipPart.serialNumber,
                    condition: receivedPart.condition,
                    receivedQuantity: receivedPart.receivedQuantity || 0,
                    notes: receivedPart.notes?.trim() || shipPart.notes
                };
            }
            return shipPart;
        });

        // Update claim status
        claim.claimStatus = hasDefectiveParts ? 'parts_rejected' : 'parts_received';

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: claim.claimStatus,
            receivedBy: receivedBy.trim(),
            receivedDate: claim.partsShipment.receivedDate,
            partsStatus: claim.partsShipment.status,
            hasDefectiveParts: hasDefectiveParts,
            partsReceived: parts.length
        }, hasDefectiveParts ?
            "UC9: Phụ tùng đã nhận nhưng có lỗi chất lượng" :
            "UC9: Phụ tùng đã nhận và kiểm tra chất lượng thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'receiveParts', error, "Lỗi server khi nhận phụ tùng", 500, {
            claimId: req.params.claimId,
            partsCount: req.body.parts?.length
        });
    }
};

/**
 * UC9: Get Parts Shipment Status
 */
const getPartsShipmentStatus = async (req, res) => {
    try {
        const { claimId } = req.params;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId)
            .select('claimNumber partsShipment claimStatus serviceCenterId');

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC9 PERMISSION: Only claim owner or admin can view shipment status
        if (claim.serviceCenterId.toString() !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền xem thông tin shipment của yêu cầu này", 403);
        }

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            claimStatus: claim.claimStatus,
            partsShipment: claim.partsShipment || {
                status: 'pending',
                parts: []
            }
        }, "UC9: Lấy thông tin shipment thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getPartsShipmentStatus', error, "Lỗi server khi lấy thông tin shipment", 500, {
            claimId: req.params.claimId
        });
    }
};

// ===================================
// UC10: REPAIR PROGRESS MANAGEMENT
// ===================================

/**
 * UC10: Start repair work
 * Status transition: parts_received -> repair_in_progress
 */
const startRepair = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { assignedTechnician, estimatedCompletionDate, notes } = req.body;

        // Validation
        if (!assignedTechnician) {
            return responseHelper.error(res, "Kỹ thuật viên được phân công là bắt buộc", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Business logic validation
        if (claim.claimStatus !== 'parts_received') {
            return responseHelper.error(res, "Chỉ có thể bắt đầu sửa chữa cho yêu cầu đã nhận phụ tùng", 400);
        }

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Bắt đầu công việc sửa chữa';
        claim._statusChangeNotes = notes || 'Công việc sửa chữa đã được khởi tạo';

        // Initialize repair progress
        claim.repairProgress = {
            status: 'in_progress',
            assignedTechnician: assignedTechnician,
            startDate: new Date(),
            estimatedCompletionDate: estimatedCompletionDate ? new Date(estimatedCompletionDate) : null,
            steps: [
                { stepType: 'diagnosis', status: 'pending' },
                { stepType: 'removal', status: 'pending' },
                { stepType: 'installation', status: 'pending' },
                { stepType: 'testing', status: 'pending' },
                { stepType: 'quality_check', status: 'pending' }
            ],
            issues: [],
            qualityCheck: { performed: false },
            totalLaborHours: 0,
            totalCost: 0
        };

        // Update claim status
        claim.claimStatus = 'repair_in_progress';

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: 'repair_in_progress',
            assignedTechnician: assignedTechnician,
            startDate: claim.repairProgress.startDate,
            estimatedCompletionDate: claim.repairProgress.estimatedCompletionDate
        }, "Bắt đầu sửa chữa thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'startRepair', error, "Lỗi server khi bắt đầu sửa chữa", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC10: Update progress step
 */
const updateProgressStep = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { stepType, status, notes } = req.body;

        // Validation
        if (!stepType || !status) {
            return responseHelper.error(res, "Loại bước và trạng thái là bắt buộc", 400);
        }

        const validSteps = ['diagnosis', 'removal', 'installation', 'testing', 'quality_check'];
        const validStatuses = ['pending', 'in_progress', 'completed', 'skipped'];

        if (!validSteps.includes(stepType)) {
            return responseHelper.error(res, "Loại bước không hợp lệ", 400);
        }

        if (!validStatuses.includes(status)) {
            return responseHelper.error(res, "Trạng thái không hợp lệ", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Business logic validation
        if (claim.claimStatus !== 'repair_in_progress') {
            return responseHelper.error(res, "Yêu cầu phải ở trạng thái đang sửa chữa", 400);
        }

        // Find and update the step
        const stepIndex = claim.repairProgress.steps.findIndex(step => step.stepType === stepType);
        if (stepIndex === -1) {
            return responseHelper.error(res, "Không tìm thấy bước", 404);
        }

        const step = claim.repairProgress.steps[stepIndex];
        const oldStatus = step.status;

        // Update step
        step.status = status;
        step.notes = notes || step.notes;
        step.performedBy = req.user.email;

        if (status === 'in_progress' && oldStatus !== 'in_progress') {
            step.startedAt = new Date();
        }

        if (status === 'completed' && oldStatus !== 'completed') {
            step.completedAt = new Date();
        }

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            stepType: stepType,
            status: status,
            updatedAt: new Date()
        }, `Cập nhật bước ${stepType} thành ${status} thành công`);

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'updateProgressStep', error, "Lỗi server khi cập nhật tiến độ", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC10: Report issue during repair
 */
const reportIssue = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { issueType, severity, description } = req.body;

        // Validation
        if (!issueType || !severity || !description) {
            return responseHelper.error(res, "Loại vấn đề, mức độ nghiêm trọng và mô tả là bắt buộc", 400);
        }

        const validIssueTypes = ['parts_mismatch', 'additional_damage', 'parts_defective', 'other'];
        const validSeverities = ['low', 'medium', 'high', 'critical'];

        if (!validIssueTypes.includes(issueType)) {
            return responseHelper.error(res, "Loại vấn đề không hợp lệ", 400);
        }

        if (!validSeverities.includes(severity)) {
            return responseHelper.error(res, "Mức độ nghiêm trọng không hợp lệ", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Business logic validation
        if (claim.claimStatus !== 'repair_in_progress') {
            return responseHelper.error(res, "Chỉ có thể báo cáo vấn đề cho yêu cầu đang sửa chữa", 400);
        }

        // Create new issue
        const newIssue = {
            issueType: issueType,
            severity: severity,
            description: description,
            reportedAt: new Date(),
            reportedBy: req.user.email,
            status: 'open'
        };

        claim.repairProgress.issues.push(newIssue);

        // If high or critical severity, put repair on hold
        if (severity === 'high' || severity === 'critical') {
            claim._statusChangedBy = req.user.email;
            claim._statusChangeReason = `Tạm dừng sửa chữa do vấn đề mức độ ${severity}`;
            claim._statusChangeNotes = description;

            claim.claimStatus = 'repair_on_hold';
            claim.repairProgress.status = 'on_hold';
        }

        await claim.save();

        const issueId = claim.repairProgress.issues[claim.repairProgress.issues.length - 1]._id;

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            issueId: issueId,
            issueType: issueType,
            severity: severity,
            status: claim.claimStatus,
            onHold: severity === 'high' || severity === 'critical'
        }, `Báo cáo vấn đề thành công${severity === 'high' || severity === 'critical' ? ' - Tạm dừng sửa chữa' : ''}`);

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'reportIssue', error, "Lỗi server khi báo cáo vấn đề", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC10: Resolve issue and resume repair
 */
const resolveIssue = async (req, res) => {
    try {
        const { claimId, issueId } = req.params;
        const { resolution } = req.body;

        // Validation
        if (!resolution) {
            return responseHelper.error(res, "Mô tả giải pháp là bắt buộc", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Find the issue
        const issue = claim.repairProgress.issues.id(issueId);
        if (!issue) {
            return responseHelper.error(res, "Không tìm thấy vấn đề", 404);
        }

        // Business logic validation
        if (issue.status === 'resolved') {
            return responseHelper.error(res, "Vấn đề đã được giải quyết", 400);
        }

        // Resolve the issue
        issue.status = 'resolved';
        issue.resolvedAt = new Date();
        issue.resolvedBy = req.user.email;
        issue.resolution = resolution;

        // Check if all high/critical issues are resolved
        const openHighCriticalIssues = claim.repairProgress.issues.filter(
            i => i.status === 'open' && (i.severity === 'high' || i.severity === 'critical')
        );

        // If no more high/critical issues, resume repair
        if (openHighCriticalIssues.length === 0 && claim.claimStatus === 'repair_on_hold') {
            claim._statusChangedBy = req.user.email;
            claim._statusChangeReason = 'Tất cả vấn đề nghiêm trọng đã được giải quyết - tiếp tục sửa chữa';
            claim._statusChangeNotes = `Vấn đề đã giải quyết: ${resolution}`;

            claim.claimStatus = 'repair_in_progress';
            claim.repairProgress.status = 'in_progress';
        }

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            issueId: issueId,
            status: claim.claimStatus,
            resumed: openHighCriticalIssues.length === 0 && claim.claimStatus === 'repair_in_progress'
        }, `Giải quyết vấn đề thành công${openHighCriticalIssues.length === 0 ? ' - Tiếp tục sửa chữa' : ''}`);

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'resolveIssue', error, "Lỗi server khi giải quyết vấn đề", 500, {
            claimId: req.params.claimId,
            issueId: req.params.issueId
        });
    }
};

/**
 * UC10: Perform quality check
 */
const performQualityCheck = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { passed, notes, checklist } = req.body;

        // Validation
        if (typeof passed !== 'boolean') {
            return responseHelper.error(res, "Kết quả kiểm tra chất lượng (passed) là bắt buộc", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Business logic validation
        if (claim.claimStatus !== 'repair_in_progress') {
            return responseHelper.error(res, "Chỉ có thể kiểm tra chất lượng cho yêu cầu đang sửa chữa", 400);
        }

        // Check if all steps are completed
        const incompleteSteps = claim.repairProgress.steps.filter(
            step => step.status !== 'completed' && step.status !== 'skipped'
        );

        if (incompleteSteps.length > 0) {
            return responseHelper.error(res, "Tất cả bước sửa chữa phải hoàn thành trước khi kiểm tra chất lượng", 400);
        }

        // Perform quality check
        claim.repairProgress.qualityCheck = {
            performed: true,
            performedAt: new Date(),
            performedBy: req.user.email,
            passed: passed,
            notes: notes || '',
            checklist: checklist || []
        };

        // Update status based on quality check result
        if (passed) {
            claim._statusChangedBy = req.user.email;
            claim._statusChangeReason = 'Kiểm tra chất lượng đạt - hoàn thành sửa chữa';
            claim._statusChangeNotes = notes || 'Kiểm tra chất lượng đạt yêu cầu';

            claim.claimStatus = 'repair_completed';
            claim.repairProgress.status = 'completed';
            claim.repairProgress.actualCompletionDate = new Date();
        } else {
            // Quality check failed - need to redo some steps
            claim.repairProgress.steps.forEach(step => {
                if (step.stepType === 'testing' || step.stepType === 'quality_check') {
                    step.status = 'pending';
                    step.completedAt = null;
                }
            });
        }

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            qualityCheckPassed: passed,
            status: claim.claimStatus,
            completedAt: claim.repairProgress.actualCompletionDate
        }, `Kiểm tra chất lượng ${passed ? 'đạt' : 'không đạt'} - ${passed ? 'Hoàn thành sửa chữa' : 'Cần làm lại'}`);

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'performQualityCheck', error, "Lỗi server khi kiểm tra chất lượng", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC10: Complete repair (final step)
 */
const completeRepair = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { totalLaborHours, totalCost, notes } = req.body;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Business logic validation
        if (claim.claimStatus !== 'repair_completed') {
            return responseHelper.error(res, "Yêu cầu phải ở trạng thái hoàn thành sửa chữa", 400);
        }

        // Ensure quality check was performed and passed
        if (!claim.repairProgress.qualityCheck.performed || !claim.repairProgress.qualityCheck.passed) {
            return responseHelper.error(res, "Kiểm tra chất lượng phải được thực hiện và đạt yêu cầu trước khi hoàn thành", 400);
        }

        // Update final details
        if (totalLaborHours !== undefined) {
            claim.repairProgress.totalLaborHours = totalLaborHours;
        }

        if (totalCost !== undefined) {
            claim.repairProgress.totalCost = totalCost;
        }

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Công việc sửa chữa hoàn thành thành công';
        claim._statusChangeNotes = notes || 'Tất cả công việc sửa chữa đã hoàn thành và được xác minh';

        // Final status update
        claim.claimStatus = 'completed';

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: 'completed',
            completedAt: claim.repairProgress.actualCompletionDate,
            totalLaborHours: claim.repairProgress.totalLaborHours,
            totalCost: claim.repairProgress.totalCost
        }, "Hoàn thành sửa chữa thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'completeRepair', error, "Lỗi server khi hoàn thành sửa chữa", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC10: Get repair progress
 */
const getRepairProgress = async (req, res) => {
    try {
        const { claimId } = req.params;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId).lean();

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Calculate progress percentage
        const totalSteps = claim.repairProgress?.steps?.length || 0;
        const completedSteps = claim.repairProgress?.steps?.filter(step => step.status === 'completed').length || 0;
        const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            vin: claim.vin,
            claimStatus: claim.claimStatus,
            repairProgress: claim.repairProgress,
            progressPercentage: progressPercentage,
            completedSteps: completedSteps,
            totalSteps: totalSteps
        }, "Lấy tiến độ sửa chữa thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getRepairProgress', error, "Lỗi server khi lấy tiến độ sửa chữa", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC10: Get repair history
 */
const getRepairHistory = async (req, res) => {
    try {
        const { claimId } = req.params;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId).lean();

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Build comprehensive history
        const history = {
            claimInfo: {
                claimId: claim._id,
                claimNumber: claim.claimNumber,
                vin: claim.vin,
                currentStatus: claim.claimStatus
            },
            repairProgress: claim.repairProgress,
            statusHistory: claim.statusHistory,
            timeline: []
        };

        // Build timeline from status history and repair events
        if (claim.statusHistory) {
            claim.statusHistory.forEach(status => {
                history.timeline.push({
                    type: 'status_change',
                    timestamp: status.changedAt,
                    description: `Status changed to ${status.status}`,
                    changedBy: status.changedBy,
                    reason: status.reason,
                    notes: status.notes
                });
            });
        }

        // Add repair step events to timeline
        if (claim.repairProgress?.steps) {
            claim.repairProgress.steps.forEach(step => {
                if (step.startedAt) {
                    history.timeline.push({
                        type: 'step_started',
                        timestamp: step.startedAt,
                        description: `Started ${step.stepType}`,
                        performedBy: step.performedBy
                    });
                }
                if (step.completedAt) {
                    history.timeline.push({
                        type: 'step_completed',
                        timestamp: step.completedAt,
                        description: `Completed ${step.stepType}`,
                        performedBy: step.performedBy,
                        notes: step.notes
                    });
                }
            });
        }

        // Add issue events to timeline
        if (claim.repairProgress?.issues) {
            claim.repairProgress.issues.forEach(issue => {
                history.timeline.push({
                    type: 'issue_reported',
                    timestamp: issue.reportedAt,
                    description: `Issue reported: ${issue.description}`,
                    severity: issue.severity,
                    reportedBy: issue.reportedBy
                });
                if (issue.resolvedAt) {
                    history.timeline.push({
                        type: 'issue_resolved',
                        timestamp: issue.resolvedAt,
                        description: `Issue resolved: ${issue.resolution}`,
                        resolvedBy: issue.resolvedBy
                    });
                }
            });
        }

        // Sort timeline by timestamp
        history.timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return responseHelper.success(res, history, "Lấy lịch sử sửa chữa thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getRepairHistory', error, "Lỗi server khi lấy lịch sử sửa chữa", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC11.1: Upload Result Photos
 * Upload photos of completed repair work
 * Status: repair_completed -> uploading_results
 */
const uploadResultPhotos = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { descriptions } = req.body; // Array of descriptions matching files
        const files = req.files;

        // ✅ UC11 VALIDATION: Check files uploaded
        if (!files || files.length === 0) {
            return responseHelper.error(res, "Phải upload ít nhất 1 ảnh kết quả", 400);
        }

        // ✅ UC11 VALIDATION: Check file count (max 20 result photos)
        if (files.length > 20) {
            return responseHelper.error(res, "Chỉ được upload tối đa 20 ảnh kết quả", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC11 PERMISSION: Only service center can upload results
        if (claim.serviceCenterId.toString() !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền upload kết quả cho yêu cầu này", 403);
        }

        // ✅ UC11 BUSINESS LOGIC: Check if can upload results
        if (!claim.canUploadResults) {
            return responseHelper.error(res, "Chỉ có thể upload kết quả khi sửa chữa đã hoàn thành (repair_completed)", 400);
        }

        // Parse descriptions if provided as JSON string
        let descriptionsArray = [];
        if (descriptions) {
            try {
                descriptionsArray = typeof descriptions === 'string' ? JSON.parse(descriptions) : descriptions;
            } catch (error) {
                return responseHelper.error(res, "Format descriptions không hợp lệ", 400);
            }
        }

        // Initialize warrantyResults if not exists
        if (!claim.warrantyResults) {
            claim.warrantyResults = {
                resultPhotos: [],
                status: 'uploading_results'
            };
        }

        // Process uploaded files
        const resultPhotos = files.map((file, index) => ({
            url: generateFileUrl(req, file.filename),
            description: descriptionsArray[index] || '',
            uploadedAt: new Date(),
            uploadedBy: req.user.sub
        }));

        // Add photos to existing array
        claim.warrantyResults.resultPhotos.push(...resultPhotos);
        claim.warrantyResults.status = 'uploading_results';

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            photosUploaded: resultPhotos.length,
            totalPhotos: claim.warrantyResults.resultPhotos.length,
            status: claim.warrantyResults.status,
            photos: resultPhotos
        }, "UC11: Upload ảnh kết quả thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'uploadResultPhotos', error, "Lỗi khi upload ảnh kết quả", 500, {
            claimId: req.params.claimId,
            filesCount: req.files?.length
        });
    }
};

/**
 * UC11.2: Update Completion Information
 * Update completion info and move to ready_for_handover
 * Status: uploading_results -> ready_for_handover
 */
const updateCompletionInfo = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { finalNotes, workSummary, testResults } = req.body;

        // ✅ UC11 VALIDATION: Required fields
        if (!workSummary || workSummary.trim().length === 0) {
            return responseHelper.error(res, "Tóm tắt công việc là bắt buộc", 400);
        }

        if (workSummary.trim().length < 20) {
            return responseHelper.error(res, "Tóm tắt công việc phải có ít nhất 20 ký tự", 400);
        }

        if (!testResults || testResults.trim().length === 0) {
            return responseHelper.error(res, "Kết quả kiểm tra là bắt buộc", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        
        if (claim.serviceCenterId.toString() !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền cập nhật thông tin hoàn thành cho yêu cầu này", 403);
        }

        
        if (!claim.warrantyResults || claim.warrantyResults.status !== 'uploading_results') {
            return responseHelper.error(res, "Phải upload ảnh kết quả trước khi cập nhật thông tin hoàn thành", 400);
        }

       
        if (!claim.warrantyResults.resultPhotos || claim.warrantyResults.resultPhotos.length === 0) {
            return responseHelper.error(res, "Phải có ít nhất 1 ảnh kết quả trước khi hoàn thành", 400);
        }

        // Update completion info
        claim.warrantyResults.completionInfo = {
            completedBy: req.user.sub,
            completedAt: new Date(),
            finalNotes: finalNotes?.trim() || '',
            workSummary: workSummary.trim(),
            testResults: testResults.trim()
        };

        // Move to ready_for_handover
        claim.warrantyResults.status = 'ready_for_handover';

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: claim.warrantyResults.status,
            completionInfo: claim.warrantyResults.completionInfo,
            readyForHandover: true
        }, "UC11: Cập nhật thông tin hoàn thành thành công - Sẵn sàng bàn giao");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'updateCompletionInfo', error, "Lỗi khi cập nhật thông tin hoàn thành", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC11.3: Record Vehicle Handover
 * Record handover information to customer
 * Status: ready_for_handover -> handed_over
 */
const recordHandover = async (req, res) => {
    try {
        const { claimId } = req.params;
        const {
            customerName,
            customerPhone,
            customerSignature,
            vehicleCondition,
            mileageAtHandover,
            notes
        } = req.body;

        // ✅ UC11 VALIDATION: Required fields
        if (!customerName || customerName.trim().length === 0) {
            return responseHelper.error(res, "Tên khách hàng là bắt buộc", 400);
        }

        if (!customerPhone || customerPhone.trim().length === 0) {
            return responseHelper.error(res, "Số điện thoại khách hàng là bắt buộc", 400);
        }

        if (!vehicleCondition) {
            return responseHelper.error(res, "Tình trạng xe là bắt buộc", 400);
        }

        const validConditions = ['excellent', 'good', 'fair', 'needs_attention'];
        if (!validConditions.includes(vehicleCondition)) {
            return responseHelper.error(res, `Tình trạng xe phải là: ${validConditions.join(', ')}`, 400);
        }

        if (mileageAtHandover === undefined || mileageAtHandover === null) {
            return responseHelper.error(res, "Số km bàn giao là bắt buộc", 400);
        }

        if (mileageAtHandover < 0) {
            return responseHelper.error(res, "Số km bàn giao không được âm", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC11 PERMISSION: Only service center can record handover
        if (claim.serviceCenterId.toString() !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền ghi nhận bàn giao cho yêu cầu này", 403);
        }

        // ✅ UC11 BUSINESS LOGIC: Check if can handover
        if (!claim.canHandover) {
            return responseHelper.error(res, "Phải hoàn thành thông tin sửa chữa trước khi bàn giao (ready_for_handover)", 400);
        }

        // ✅ UC11 VALIDATION: Check mileage is greater than initial mileage
        if (claim.mileage && mileageAtHandover < claim.mileage) {
            return responseHelper.error(res, "Số km bàn giao không được nhỏ hơn số km khi nhận xe", 400);
        }

        // Record handover info
        claim.warrantyResults.handoverInfo = {
            handoverDate: new Date(),
            handedOverBy: req.user.sub,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerSignature: customerSignature?.trim() || '',
            vehicleCondition: vehicleCondition,
            mileageAtHandover: mileageAtHandover,
            notes: notes?.trim() || ''
        };

        // Move to handed_over
        claim.warrantyResults.status = 'handed_over';

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Xe đã được bàn giao cho khách hàng';
        claim._statusChangeNotes = `Khách hàng: ${customerName.trim()}, Tình trạng: ${vehicleCondition}`;

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: claim.warrantyResults.status,
            handoverInfo: claim.warrantyResults.handoverInfo,
            handoverDate: claim.warrantyResults.handoverInfo.handoverDate
        }, "UC11: Ghi nhận bàn giao xe thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'recordHandover', error, "Lỗi khi ghi nhận bàn giao", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC11.4: Close Warranty Case
 * Final closure of warranty claim
 * Status: handed_over -> closed
 */
const closeWarrantyCase = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { finalNotes } = req.body;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        
        if (!['admin', 'manager'].includes(req.user.role)) {
            return responseHelper.error(res, "Chỉ admin hoặc manager mới có thể đóng case bảo hành", 403);
        }

      
        if (!claim.warrantyResults || claim.warrantyResults.status !== 'handed_over') {
            return responseHelper.error(res, "Chỉ có thể đóng case khi đã bàn giao xe (handed_over)", 400);
        }

       
        if (!claim.warrantyResults.completionInfo || !claim.warrantyResults.handoverInfo) {
            return responseHelper.error(res, "Phải có đầy đủ thông tin hoàn thành và bàn giao trước khi đóng case", 400);
        }

        // Close warranty case
        claim.warrantyResults.status = 'closed';
        claim.warrantyResults.closedAt = new Date();
        claim.warrantyResults.closedBy = req.user.sub;

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Case bảo hành đã được đóng';
        claim._statusChangeNotes = finalNotes?.trim() || 'Case đã hoàn thành đầy đủ quy trình';

        // Update claim status to completed
        claim.claimStatus = 'completed';
        claim.completedAt = new Date();

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            claimStatus: claim.claimStatus,
            warrantyStatus: claim.warrantyResults.status,
            closedAt: claim.warrantyResults.closedAt,
            closedBy: req.user.email,
            isFullyClosed: claim.isFullyClosed
        }, "UC11: Đóng case bảo hành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'closeWarrantyCase', error, "Lỗi khi đóng case bảo hành", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC11.5: Get Warranty Results
 * Get complete warranty results information
 */
const getWarrantyResults = async (req, res) => {
    try {
        const { claimId } = req.params;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId)
            .populate('warrantyResults.resultPhotos.uploadedBy', 'email name')
            .populate('warrantyResults.completionInfo.completedBy', 'email name')
            .populate('warrantyResults.handoverInfo.handedOverBy', 'email name')
            .populate('warrantyResults.closedBy', 'email name')
            .lean();

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC11 PERMISSION: Check access rights
        if (claim.serviceCenterId.toString() !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền xem kết quả bảo hành của yêu cầu này", 403);
        }

        // Calculate summary statistics
        const summary = {
            hasResults: !!claim.warrantyResults,
            totalPhotos: claim.warrantyResults?.resultPhotos?.length || 0,
            isCompleted: !!claim.warrantyResults?.completionInfo,
            isHandedOver: !!claim.warrantyResults?.handoverInfo,
            isClosed: claim.warrantyResults?.status === 'closed',
            isFullyClosed: claim.isFullyClosed
        };

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            vin: claim.vin,
            claimStatus: claim.claimStatus,
            warrantyResults: claim.warrantyResults || null,
            summary: summary,
            canUploadResults: claim.canUploadResults,
            canHandover: claim.canHandover
        }, "UC11: Lấy thông tin kết quả bảo hành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getWarrantyResults', error, "Lỗi khi lấy thông tin kết quả", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * UC11.6: Generate Warranty Document
 * Generate comprehensive warranty completion document (PDF/Report)
 */
const generateWarrantyDocument = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { format = 'json' } = req.query; // json, pdf (future)

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId)
            .populate('warrantyActivationId')
            .populate('repairProgress.assignedTechnician', 'email name')
            .lean();

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ UC11 PERMISSION: Check access rights
        if (claim.serviceCenterId.toString() !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền tạo tài liệu bảo hành của yêu cầu này", 403);
        }

        // ✅ UC11 VALIDATION: Must be completed or closed
        if (!claim.warrantyResults || !['handed_over', 'closed'].includes(claim.warrantyResults.status)) {
            return responseHelper.error(res, "Chỉ có thể tạo tài liệu cho case đã bàn giao hoặc đã đóng", 400);
        }

        // Build comprehensive document
        const document = {
            metadata: {
                generatedAt: new Date(),
                generatedBy: req.user.email,
                documentType: 'WARRANTY_COMPLETION_REPORT',
                version: '1.0'
            },
            claimInfo: {
                claimNumber: claim.claimNumber,
                claimId: claim._id,
                vin: claim.vin,
                status: claim.claimStatus,
                createdAt: claim.createdAt,
                completedAt: claim.completedAt
            },
            serviceCenter: {
                id: claim.serviceCenterId,
                name: claim.serviceCenterName,
                code: claim.serviceCenterCode
            },
            issue: {
                description: claim.issueDescription,
                category: claim.issueCategory,
                diagnosis: claim.diagnosis,
                mileageAtIntake: claim.mileage
            },
            partsReplaced: claim.partsToReplace,
            repairSummary: {
                status: claim.repairProgress?.status,
                startDate: claim.repairProgress?.startDate,
                completionDate: claim.repairProgress?.actualCompletionDate,
                assignedTechnician: claim.repairProgress?.assignedTechnician,
                totalLaborHours: claim.repairProgress?.totalLaborHours,
                totalCost: claim.repairProgress?.totalCost,
                qualityCheck: claim.repairProgress?.qualityCheck,
                stepsCompleted: claim.repairProgress?.steps?.filter(s => s.status === 'completed').length,
                totalSteps: claim.repairProgress?.steps?.length
            },
            warrantyResults: {
                status: claim.warrantyResults.status,
                completionInfo: claim.warrantyResults.completionInfo,
                handoverInfo: claim.warrantyResults.handoverInfo,
                resultPhotos: claim.warrantyResults.resultPhotos?.map(photo => ({
                    url: photo.url,
                    description: photo.description,
                    uploadedAt: photo.uploadedAt
                })),
                closedAt: claim.warrantyResults.closedAt
            },
            timeline: claim.statusHistory?.map(status => ({
                status: status.status,
                changedAt: status.changedAt,
                changedBy: status.changedBy,
                reason: status.reason
            }))
        };

        // For JSON format, return document
        if (format === 'json') {
            return responseHelper.success(res, {
                document: document,
                format: 'json'
            }, "UC11: Tạo tài liệu bảo hành thành công");
        }

        // For PDF format (future implementation)
        if (format === 'pdf') {
            // TODO: Implement PDF generation
            return responseHelper.error(res, "Định dạng PDF chưa được hỗ trợ", 501);
        }

        return responseHelper.error(res, "Định dạng không hợp lệ", 400);

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'generateWarrantyDocument', error, "Lỗi khi tạo tài liệu bảo hành", 500, {
            claimId: req.params.claimId
        });
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
    addApprovalNotes,
    // UC9: Parts Management methods
    shipParts,
    receiveParts,
    getPartsShipmentStatus,
    // UC10: Repair Progress Management methods
    startRepair,
    updateProgressStep,
    reportIssue,
    resolveIssue,
    performQualityCheck,
    completeRepair,
    getRepairProgress,
    getRepairHistory,
    // UC11: Warranty Results methods
    uploadResultPhotos,
    updateCompletionInfo,
    recordHandover,
    closeWarrantyCase,
    getWarrantyResults,
    generateWarrantyDocument
};
