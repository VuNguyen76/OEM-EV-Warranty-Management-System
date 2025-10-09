const responseHelper = require('../../shared/utils/responseHelper');
const WarrantyClaimModel = require('../Model/WarrantyClaim');
const WarrantyActivationModel = require('../Model/WarrantyActivation');
const { generateFileUrl } = require('../../shared/middleware/MulterMiddleware');
const { verifyVINInVehicleService, normalizeVIN } = require('../../shared/services/VehicleServiceHelper');
// Import warranty results services
const WarrantyResultsStorageService = require('../../shared/services/WarrantyResultsStorageService');

/**
 * Tạo Yêu Cầu Bảo Hành
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

        // Kiểm tra các trường bắt buộc
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

        // Bước 1: Xác minh VIN có bảo hành hoạt động
        const WarrantyActivation = WarrantyActivationModel();
        const warrantyActivation = await WarrantyActivation.findOne({
            vin: vinUpper,
            warrantyStatus: 'active'
        });

        if (!warrantyActivation) {
            return responseHelper.error(res, "VIN này không có bảo hành hoạt động. Vui lòng kích hoạt bảo hành trước", 400);
        }

        // Bước 2: Kiểm tra bảo hành còn hiệu lực
        const currentDate = new Date();
        if (currentDate > warrantyActivation.warrantyEndDate) {
            return responseHelper.error(res, "Bảo hành đã hết hạn", 400);
        }

        // Bước 3: Xác minh VIN tồn tại trong Vehicle Service
        try {
            await verifyVINInVehicleService(vin, req.headers.authorization);
        } catch (error) {
            if (error.message === 'VEHICLE_NOT_FOUND') {
                return responseHelper.error(res, "Không tìm thấy xe với VIN này", 404);
            }
            return responseHelper.error(res, "Không thể xác minh thông tin xe", 500);
        }

        // Bước 4: Tạo số claim
        const currentYear = new Date().getFullYear();
        const WarrantyClaim = WarrantyClaimModel();

        // Lấy số claim tiếp theo cho năm này
        const lastClaim = await WarrantyClaim.findOne({
            claimNumber: { $regex: `^WC-${currentYear}-` }
        }).sort({ claimNumber: -1 });

        let nextNumber = 1;
        if (lastClaim) {
            const lastNumber = parseInt(lastClaim.claimNumber.split('-')[2]);
            nextNumber = lastNumber + 1;
        }

        const claimNumber = `WC-${currentYear}-${nextNumber.toString().padStart(5, '0')}`;

        // Kiểm tra các trường bắt buộc
        if (mileage === undefined || mileage === null) {
            return responseHelper.error(res, "Mileage là bắt buộc", 400);
        }

        // Bước 5: Tạo warranty claim
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
        }, "Tạo yêu cầu bảo hành thành công", 201);

    } catch (error) {
        console.error('Error in createWarrantyClaim:', error);
        return responseHelper.error(res, "Lỗi khi tạo yêu cầu bảo hành", 500);
    }
};

/**
 * Đính Kèm Báo Cáo Kiểm Tra
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

        // Kiểm tra có file được upload hay không
        if (!files || files.length === 0) {
            return responseHelper.error(res, "Không có file nào được upload", 400);
        }

        // Kiểm tra số lượng file (tối đa 10 files mỗi lần upload)
        if (files.length > 10) {
            return responseHelper.error(res, "Chỉ được upload tối đa 10 files mỗi lần", 400);
        }

        // Bước 1: Tìm warranty claim
        const WarrantyClaim = WarrantyClaimModel();
        const warrantyClaim = await WarrantyClaim.findById(claimId);

        if (!warrantyClaim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Bước 2: Kiểm tra quyền (chỉ người tạo claim hoặc admin mới có thể thêm đính kèm)
        if (warrantyClaim.serviceCenterId !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền thêm attachment cho yêu cầu này", 403);
        }

        // Kiểm tra claim có còn có thể chỉnh sửa hay không
        if (warrantyClaim.isClosed) {
            return responseHelper.error(res, "Không thể thêm attachment cho yêu cầu đã đóng (completed/cancelled/rejected)", 400);
        }

        // Bước 3: Xử lý files đã upload
        const attachments = files.map(file => ({
            fileName: file.originalname,
            fileUrl: generateFileUrl(req, file.filename),
            fileType: file.mimetype,
            uploadedAt: new Date(),
            uploadedBy: req.user.email,
            attachmentType: attachmentType || 'inspection_report'
        }));

        // Bước 4: Thêm đính kèm vào claim
        warrantyClaim.attachments.push(...attachments);
        warrantyClaim.updatedAt = new Date();

        // ✅ SỬA: Nối notes an toàn
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
        }, "Đính kèm báo cáo kiểm tra thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'addClaimAttachment', error, "Lỗi khi đính kèm file", 500, {
            claimId: req.params.claimId,
            filesCount: req.files?.length
        });
    }
};

// Lấy claim theo ID
const getClaimById = async (req, res) => {
    try {
        const { claimId } = req.params;

        const WarrantyClaim = WarrantyClaimModel();
        const warrantyClaim = await WarrantyClaim.findById(claimId);
        // .populate('warrantyActivationId'); // TODO: Sửa đăng ký model WarrantyActivation

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

// Lấy claims theo VIN
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

// Lấy claims theo trung tâm dịch vụ
const getClaimsByServiceCenter = async (req, res) => {
    try {
        const serviceCenterId = req.user.sub;
        const { page = 1, limit = 10, status } = req.query;

        const WarrantyClaim = WarrantyClaimModel();

        // Xây dựng query
        const query = { serviceCenterId };
        if (status) {
            query.claimStatus = status;
        }

        // ✅ PHÂN TRANG: Hỗ trợ phân trang cho danh sách claim lớn
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
 * Theo Dõi Trạng Thái Yêu Cầu
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

        // Kiểm tra quyền: chỉ chủ claim hoặc admin mới xem được lịch sử
        if (claim.serviceCenterId !== req.user.sub && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền xem lịch sử trạng thái của yêu cầu này", 403);
        }

        // Sắp xếp lịch sử trạng thái theo ngày (mới nhất trước)
        const statusHistory = claim.statusHistory || [];
        const sortedHistory = statusHistory.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

        // Hỗ trợ phân trang cho lịch sử dài
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
        }, "Lấy lịch sử trạng thái thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getClaimStatusHistory', error, "Lỗi server khi lấy lịch sử trạng thái", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * Phê Duyệt/Từ Chối Yêu Cầu
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

        // Kiểm tra trạng thái claim
        if (claim.claimStatus !== 'under_review') {
            return responseHelper.error(res, "Chỉ có thể phê duyệt claim đang ở trạng thái 'under_review'", 400);
        }

        // Kiểm tra bảo hành còn hiệu lực
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

        // Đặt các trường tạm thời cho pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Claim approved by reviewer';
        claim._statusChangeNotes = approvalNotes || 'Claim has been approved for processing';

        // Cập nhật trạng thái to approved
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
        }, "Phê duyệt yêu cầu bảo hành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'approveWarrantyClaim', error, "Lỗi server khi phê duyệt yêu cầu", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * Phê Duyệt/Từ Chối Yêu Cầu
 * - Từ chối claim với lý do bắt buộc
 */
const rejectWarrantyClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { rejectionReason, rejectionNotes } = req.body;

        // Lý do từ chối là bắt buộc
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

        // Kiểm tra trạng thái claim
        if (claim.claimStatus !== 'under_review') {
            return responseHelper.error(res, "Chỉ có thể từ chối claim đang ở trạng thái 'under_review'", 400);
        }

        // Đặt các trường tạm thời cho pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = rejectionReason.trim();
        claim._statusChangeNotes = rejectionNotes?.trim() || '';

        // Cập nhật trạng thái to rejected
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
        }, "Từ chối yêu cầu bảo hành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'rejectWarrantyClaim', error, "Lỗi server khi từ chối yêu cầu", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * Phê Duyệt/Từ Chối Yêu Cầu
 * - Lấy danh sách claims cần phê duyệt
 */
const getClaimsForApproval = async (req, res) => {
    try {
        const { page = 1, limit = 10, priority, issueCategory } = req.query;
        const skip = (page - 1) * limit;

        const WarrantyClaim = WarrantyClaimModel();

        // Lọc các claim đang được xem xét
        let filter = { claimStatus: 'under_review' };

        // Bộ lọc tùy chọn
        if (priority) {
            filter.priority = priority;
        }

        if (issueCategory) {
            filter.issueCategory = issueCategory;
        }

        const [claims, totalClaims] = await Promise.all([
            WarrantyClaim.find(filter)
                .select('claimNumber vin issueDescription issueCategory priority createdAt partsToReplace serviceCenterName')
                .sort({ priority: -1, createdAt: 1 }) // Ưu tiên cao trước, sau đó cũ nhất trước
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            WarrantyClaim.countDocuments(filter)
        ]);

        // ✅ Tính toán chi phí ước tính cho mỗi claim
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
        }, "Lấy danh sách claims cần phê duyệt thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getClaimsForApproval', error, "Lỗi server khi lấy danh sách claims", 500);
    }
};

/**
 * Phê Duyệt/Từ Chối Yêu Cầu
 * - Thêm ghi chú cho claim
 */
const addApprovalNotes = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { notes } = req.body;

        // Ghi chú là bắt buộc
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

        // Chỉ reviewer mới có thể thêm ghi chú phê duyệt
        if (!['service_staff', 'admin'].includes(req.user.role)) {
            return responseHelper.error(res, "Chỉ reviewer mới có thể thêm ghi chú phê duyệt", 403);
        }

        // Khởi tạo mảng approvalNotes nếu chưa tồn tại
        if (!claim.approvalNotes) {
            claim.approvalNotes = [];
        }

        // Thêm ghi chú mới
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
        }, "Thêm ghi chú phê duyệt thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'addApprovalNotes', error, "Lỗi server khi thêm ghi chú", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * Ship Parts - Confirm parts shipment for approved claim
 */
const shipParts = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { trackingNumber, shippedDate, parts } = req.body;

        // Kiểm tra các trường bắt buộc
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

        // Kiểm tra trạng thái claim
        if (claim.claimStatus !== 'approved') {
            return responseHelper.error(res, "Chỉ có thể ship parts cho claim đã được phê duyệt", 400);
        }

        // Kiểm tra parts khớp với danh sách đã phê duyệt
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

        // Đặt các trường tạm thời cho pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Parts shipped to service center';
        claim._statusChangeNotes = `Tracking: ${trackingNumber}`;

        // Cập nhật thông tin vận chuyển phụ tùng
        claim.partsShipment = {
            status: 'shipped',
            shippedDate: shippedDate ? new Date(shippedDate) : new Date(),
            trackingNumber: trackingNumber.trim(),
            parts: parts.map(part => ({
                partId: part.partId,
                partName: part.partName.trim(),
                quantity: part.quantity,
                serialNumber: part.serialNumber?.trim() || '',
                condition: 'good', // Điều kiện mặc định when shipped
                receivedQuantity: 0, // Sẽ được cập nhật khi nhận
                notes: part.notes?.trim() || ''
            }))
        };

        // Cập nhật trạng thái claim
        claim.claimStatus = 'parts_shipped';

        await claim.save();

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: 'parts_shipped',
            trackingNumber: trackingNumber.trim(),
            shippedDate: claim.partsShipment.shippedDate,
            partsCount: parts.length
        }, "Phụ tùng đã được ship thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'shipParts', error, "Lỗi server khi ship phụ tùng", 500, {
            claimId: req.params.claimId,
            partsCount: req.body.parts?.length
        });
    }
};

/**
 * Receive Parts - Confirm parts receipt and quality check
 */
const receiveParts = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { receivedBy, parts, qualityCheckNotes } = req.body;

        // Kiểm tra các trường bắt buộc
        if (!receivedBy || receivedBy.trim().length === 0) {
            return responseHelper.error(res, "Người nhận là bắt buộc", 400);
        }

        if (!parts || !Array.isArray(parts) || parts.length === 0) {
            return responseHelper.error(res, "Danh sách phụ tùng nhận được là bắt buộc", 400);
        }

        // Kiểm tra từng part
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

        // Kiểm tra trạng thái claim
        if (claim.claimStatus !== 'parts_shipped') {
            return responseHelper.error(res, "Chỉ có thể nhận parts cho claim đã được ship", 400);
        }

        // Số serial phải là duy nhất
        const serialNumbers = parts.filter(p => p.serialNumber).map(p => p.serialNumber);
        const uniqueSerials = new Set(serialNumbers);
        if (serialNumbers.length !== uniqueSerials.size) {
            return responseHelper.error(res, "Số serial không được trùng lặp", 400);
        }

        // Kiểm tra có phụ tùng nào bị hỏng/lỗi
        const hasDefectiveParts = parts.some(part =>
            part.condition === 'damaged' || part.condition === 'defective'
        );

        // Đặt các trường tạm thời cho pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = hasDefectiveParts ?
            'Parts received but some are defective' :
            'Parts received and quality checked';
        claim._statusChangeNotes = qualityCheckNotes || '';

        // Cập nhật thông tin vận chuyển phụ tùng
        claim.partsShipment.status = hasDefectiveParts ? 'rejected' : 'received';
        claim.partsShipment.receivedDate = new Date();
        claim.partsShipment.receivedBy = receivedBy;
        claim.partsShipment.qualityCheckNotes = qualityCheckNotes || '';

        // Cập nhật parts với thông tin nhận được
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

        // Cập nhật trạng thái claim
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
            "Phụ tùng đã nhận nhưng có lỗi chất lượng" :
            "Phụ tùng đã nhận và kiểm tra chất lượng thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'receiveParts', error, "Lỗi server khi nhận phụ tùng", 500, {
            claimId: req.params.claimId,
            partsCount: req.body.parts?.length
        });
    }
};

/**
 * Get Parts Shipment Status
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

        // Chỉ chủ claim hoặc admin mới xem được trạng thái shipment
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
        }, "Lấy thông tin shipment thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getPartsShipmentStatus', error, "Lỗi server khi lấy thông tin shipment", 500, {
            claimId: req.params.claimId
        });
    }
};

// ===================================
// QUẢN LÝ TIẾN ĐỘ SỬA CHỮA
// ===================================

/**
 * Start repair work
 * Status transition: parts_received -> repair_in_progress
 */
const startRepair = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { assignedTechnician, estimatedCompletionDate, notes } = req.body;

        // Kiểm tra dữ liệu
        if (!assignedTechnician) {
            return responseHelper.error(res, "Kỹ thuật viên được phân công là bắt buộc", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Kiểm tra logic nghiệp vụ
        if (claim.claimStatus !== 'parts_received') {
            return responseHelper.error(res, "Chỉ có thể bắt đầu sửa chữa cho yêu cầu đã nhận phụ tùng", 400);
        }

        // Đặt các trường tạm thời cho pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Bắt đầu công việc sửa chữa';
        claim._statusChangeNotes = notes || 'Công việc sửa chữa đã được khởi tạo';

        // Khởi tạo tiến độ sửa chữa
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

        // Cập nhật trạng thái claim
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
 * Update progress step
 */
const updateProgressStep = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { stepType, status, notes } = req.body;

        // Kiểm tra dữ liệu
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

        // Kiểm tra logic nghiệp vụ
        if (claim.claimStatus !== 'repair_in_progress') {
            return responseHelper.error(res, "Yêu cầu phải ở trạng thái đang sửa chữa", 400);
        }

        // Tìm và cập nhật bước
        const stepIndex = claim.repairProgress.steps.findIndex(step => step.stepType === stepType);
        if (stepIndex === -1) {
            return responseHelper.error(res, "Không tìm thấy bước", 404);
        }

        const step = claim.repairProgress.steps[stepIndex];
        const oldStatus = step.status;

        // Cập nhật bước
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
 * Report issue during repair
 */
const reportIssue = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { issueType, severity, description } = req.body;

        // Kiểm tra dữ liệu
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

        // Kiểm tra logic nghiệp vụ
        if (claim.claimStatus !== 'repair_in_progress') {
            return responseHelper.error(res, "Chỉ có thể báo cáo vấn đề cho yêu cầu đang sửa chữa", 400);
        }

        // Tạo vấn đề mới
        const newIssue = {
            issueType: issueType,
            severity: severity,
            description: description,
            reportedAt: new Date(),
            reportedBy: req.user.email,
            status: 'open'
        };

        claim.repairProgress.issues.push(newIssue);

        // Nếu mức độ nghiêm trọng cao hoặc tới hạn, tạm dừng sửa chữa
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
 * Resolve issue and resume repair
 */
const resolveIssue = async (req, res) => {
    try {
        const { claimId, issueId } = req.params;
        const { resolution } = req.body;

        // Kiểm tra dữ liệu
        if (!resolution) {
            return responseHelper.error(res, "Mô tả giải pháp là bắt buộc", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Tìm vấn đề
        const issue = claim.repairProgress.issues.id(issueId);
        if (!issue) {
            return responseHelper.error(res, "Không tìm thấy vấn đề", 404);
        }

        // Kiểm tra logic nghiệp vụ
        if (issue.status === 'resolved') {
            return responseHelper.error(res, "Vấn đề đã được giải quyết", 400);
        }

        // Giải quyết vấn đề
        issue.status = 'resolved';
        issue.resolvedAt = new Date();
        issue.resolvedBy = req.user.email;
        issue.resolution = resolution;

        // Kiểm tra tất cả vấn đề cao/tới hạn đã được giải quyết
        const openHighCriticalIssues = claim.repairProgress.issues.filter(
            i => i.status === 'open' && (i.severity === 'high' || i.severity === 'critical')
        );

        // Nếu không còn vấn đề cao/tới hạn, tiếp tục sửa chữa
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
 * Perform quality check
 */
const performQualityCheck = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { passed, notes, checklist } = req.body;

        // Kiểm tra dữ liệu
        if (typeof passed !== 'boolean') {
            return responseHelper.error(res, "Kết quả kiểm tra chất lượng (passed) là bắt buộc", 400);
        }

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Kiểm tra logic nghiệp vụ
        if (claim.claimStatus !== 'repair_in_progress') {
            return responseHelper.error(res, "Chỉ có thể kiểm tra chất lượng cho yêu cầu đang sửa chữa", 400);
        }

        // Kiểm tra tất cả bước đã hoàn thành
        const incompleteSteps = claim.repairProgress.steps.filter(
            step => step.status !== 'completed' && step.status !== 'skipped'
        );

        if (incompleteSteps.length > 0) {
            return responseHelper.error(res, "Tất cả bước sửa chữa phải hoàn thành trước khi kiểm tra chất lượng", 400);
        }

        // Thực hiện kiểm tra chất lượng
        claim.repairProgress.qualityCheck = {
            performed: true,
            performedAt: new Date(),
            performedBy: req.user.email,
            passed: passed,
            notes: notes || '',
            checklist: checklist || []
        };

        // Cập nhật trạng thái based on quality check result
        if (passed) {
            claim._statusChangedBy = req.user.email;
            claim._statusChangeReason = 'Kiểm tra chất lượng đạt - hoàn thành sửa chữa';
            claim._statusChangeNotes = notes || 'Kiểm tra chất lượng đạt yêu cầu';

            claim.claimStatus = 'repair_completed';
            claim.repairProgress.status = 'completed';
            claim.repairProgress.actualCompletionDate = new Date();
        } else {
            // Kiểm tra chất lượng thất bại - cần làm lại một số bước
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
 * Complete repair (final step)
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

        // Kiểm tra logic nghiệp vụ
        if (claim.claimStatus !== 'repair_completed') {
            return responseHelper.error(res, "Yêu cầu phải ở trạng thái hoàn thành sửa chữa", 400);
        }

        // Đảm bảo kiểm tra chất lượng đã được thực hiện và pass
        if (!claim.repairProgress.qualityCheck.performed || !claim.repairProgress.qualityCheck.passed) {
            return responseHelper.error(res, "Kiểm tra chất lượng phải được thực hiện và đạt yêu cầu trước khi hoàn thành", 400);
        }

        // Cập nhật chi tiết cuối cùng
        if (totalLaborHours !== undefined) {
            claim.repairProgress.totalLaborHours = totalLaborHours;
        }

        if (totalCost !== undefined) {
            claim.repairProgress.totalCost = totalCost;
        }

        // Đặt các trường tạm thời cho pre-save middleware
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Công việc sửa chữa hoàn thành thành công';
        claim._statusChangeNotes = notes || 'Tất cả công việc sửa chữa đã hoàn thành và được xác minh';

        // Cập nhật trạng thái cuối cùng
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
 * Get repair progress
 */
const getRepairProgress = async (req, res) => {
    try {
        const { claimId } = req.params;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId).lean();

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Tính toán tiến độ percentage
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
 * Get repair history
 */
const getRepairHistory = async (req, res) => {
    try {
        const { claimId } = req.params;

        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId).lean();

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Xây dựng lịch sử toàn diện
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

        // Thêm sự kiện bước sửa chữa vào timeline
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

        // Thêm sự kiện vấn đề vào timeline
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

        // Sắp xếp timeline theo timestamp
        history.timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return responseHelper.success(res, history, "Lấy lịch sử sửa chữa thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getRepairHistory', error, "Lỗi server khi lấy lịch sử sửa chữa", 500, {
            claimId: req.params.claimId
        });
    }
};

// ===================================
// QUẢN LÝ KẾT QUẢ BẢO HÀNH
// ===================================

/**
 * Upload ảnh kết quả bảo hành
 * Upload ảnh kết quả sau khi hoàn thành sửa chữa, bao gồm ảnh trước/sau sửa chữa,
 * ảnh phụ tùng đã thay thế, và các ảnh minh chứng khác
 *
 * Quy trình:
 * 1. Kiểm tra claim tồn tại và ở trạng thái 'repair_completed'
 * 2. Xác thực quyền truy cập (chỉ service center của claim hoặc admin)
 * 3. Validate files upload (jpg/jpeg/png, max 10MB/file, max 10 files)
 * 4. Lưu files vào storage và cập nhật database
 * 5. Chuyển trạng thái claim sang 'uploading_results'
 *
 * @route POST /api/warranty/claims/:claimId/results/photos
 * @access technician, service_staff, admin
 * @param {string} claimId - ID của warranty claim
 * @param {Array} photos - Danh sách file ảnh (multipart/form-data)
 * @param {Array} descriptions - Mô tả cho từng ảnh (JSON string)
 */
const uploadResultPhotos = async (req, res) => {
    try {
        const { claimId } = req.params;
        const userId = req.user.sub;

        // ✅ KIỂM TRA: Claim phải tồn tại
        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            // Dọn dẹp files đã upload nếu không tìm thấy claim
            if (req.files && req.files.length > 0) {
                WarrantyResultsStorageService.cleanupUploadedFiles(req.files);
            }
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // ✅ KIỂM TRA: Trạng thái claim phải là repair_completed
        if (claim.claimStatus !== 'repair_completed') {
            // Dọn dẹp files đã upload
            if (req.files && req.files.length > 0) {
                WarrantyResultsStorageService.cleanupUploadedFiles(req.files);
            }
            return responseHelper.error(res, "Chỉ có thể upload ảnh khi claim ở trạng thái 'repair_completed'", 400);
        }

        // ✅ KIỂM TRA: Kiểm tra quyền
        if (claim.serviceCenterId.toString() !== userId && req.user.role !== 'admin') {
            // Dọn dẹp files đã upload
            if (req.files && req.files.length > 0) {
                WarrantyResultsStorageService.cleanupUploadedFiles(req.files);
            }
            return responseHelper.error(res, "Không có quyền upload ảnh cho claim này", 403);
        }

        // ✅ VALIDATION: Files validation (đã được validate bởi middleware)
        const validationResult = WarrantyResultsStorageService.validateUploadedFiles(req.files);
        if (!validationResult.valid) {
            // Dọn dẹp files đã upload
            WarrantyResultsStorageService.cleanupUploadedFiles(req.files);
            return responseHelper.error(res, validationResult.errors.join(', '), 400);
        }

        // ✅ LOGIC NGHIỆP VỤ: Xử lý ảnh đã upload
        const photoObjects = WarrantyResultsStorageService.processUploadedPhotos(
            req.files,
            req.parsedDescriptions, // Đã được parse bởi middleware
            userId,
            req
        );

        // Khởi tạo warrantyResults nếu chưa tồn tại
        if (!claim.warrantyResults) {
            claim.warrantyResults = {
                resultPhotos: [],
                completionInfo: {},
                handoverInfo: {},
                status: 'uploading_results'
            };
        }

        // Thêm ảnh vào claim
        claim.warrantyResults.resultPhotos.push(...photoObjects);

        // Cập nhật trạng thái kết quả bảo hành
        if (!claim.warrantyResults.status) {
            claim.warrantyResults.status = 'uploading_results';
        }

        // Đặt audit trail cho thay đổi trạng thái
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Upload ảnh kết quả bảo hành';
        claim._statusChangeNotes = `Uploaded ${photoObjects.length} result photos`;

        // Lưu claim
        await claim.save();

        // Chuẩn bị phản hồi
        const responseData = {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            photosUploaded: photoObjects.length,
            photos: photoObjects.map(photo => ({
                url: photo.url,
                description: photo.description,
                uploadedAt: photo.uploadedAt
            })),
            warrantyResultsStatus: claim.warrantyResults.status
        };

        return responseHelper.success(res, responseData, "Upload ảnh kết quả thành công");

    } catch (error) {
        // Dọn dẹp files đã upload on error
        if (req.files && req.files.length > 0) {
            WarrantyResultsStorageService.cleanupUploadedFiles(req.files);
        }

        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'uploadResultPhotos', error, "Lỗi server khi upload ảnh kết quả", 500, {
            claimId: req.params.claimId,
            filesCount: req.files?.length || 0
        });
    }
};

/**
 * Cập nhật thông tin hoàn thành sửa chữa
 * Ghi lại chi tiết công việc đã thực hiện, kết quả kiểm tra và ghi chú cuối cùng
 *
 * Quy trình:
 * 1. Kiểm tra claim tồn tại và ở trạng thái 'repair_completed'
 * 2. Xác thực quyền truy cập và validate dữ liệu đầu vào
 * 3. Kiểm tra đã upload ít nhất 1 ảnh kết quả
 * 4. Cập nhật thông tin hoàn thành vào database
 * 5. Chuyển trạng thái claim sang 'ready_for_handover'
 *
 * @route POST /api/warranty/claims/:claimId/results/completion
 * @access technician, service_staff, admin
 * @param {string} claimId - ID của warranty claim
 * @param {string} workSummary - Tóm tắt công việc đã thực hiện (bắt buộc)
 * @param {string} testResults - Kết quả kiểm tra sau sửa chữa (bắt buộc)
 * @param {string} finalNotes - Ghi chú cuối cùng (tùy chọn)
 */
const updateCompletionInfo = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { workSummary, testResults, finalNotes } = req.body;
        const userId = req.user.sub;

        // ✅ KIỂM TRA: Các trường bắt buộc
        if (!workSummary || workSummary.trim().length === 0) {
            return responseHelper.error(res, "workSummary là bắt buộc", 400);
        }
        if (!testResults || testResults.trim().length === 0) {
            return responseHelper.error(res, "testResults là bắt buộc", 400);
        }

        // ✅ KIỂM TRA: Giới hạn độ dài trường
        if (workSummary.trim().length > 2000) {
            return responseHelper.error(res, "workSummary quá dài (tối đa 2000 ký tự)", 400);
        }
        if (testResults.trim().length > 2000) {
            return responseHelper.error(res, "testResults quá dài (tối đa 2000 ký tự)", 400);
        }
        if (finalNotes && finalNotes.trim().length > 2000) {
            return responseHelper.error(res, "finalNotes quá dài (tối đa 2000 ký tự)", 400);
        }

        // Kiểm tra claim có tồn tại hay không
        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Kiểm tra trạng thái claim phải là repair_completed
        if (claim.claimStatus !== 'repair_completed') {
            return responseHelper.error(res, "Chỉ có thể cập nhật thông tin hoàn thành khi claim ở trạng thái 'repair_completed'", 400);
        }

        // Kiểm tra quyền truy cập
        if (claim.serviceCenterId.toString() !== userId && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền cập nhật thông tin hoàn thành cho claim này", 403);
        }

        // Kiểm tra phải có ít nhất 1 ảnh kết quả
        if (!claim.warrantyResults || !claim.warrantyResults.resultPhotos || claim.warrantyResults.resultPhotos.length === 0) {
            return responseHelper.error(res, "Phải upload ít nhất 1 ảnh kết quả trước khi cập nhật thông tin hoàn thành", 400);
        }

        // Cập nhật thông tin hoàn thành
        if (!claim.warrantyResults.completionInfo) {
            claim.warrantyResults.completionInfo = {};
        }

        claim.warrantyResults.completionInfo.completedBy = userId;
        claim.warrantyResults.completionInfo.completedAt = new Date();
        claim.warrantyResults.completionInfo.workSummary = workSummary.trim();
        claim.warrantyResults.completionInfo.testResults = testResults.trim();
        claim.warrantyResults.completionInfo.finalNotes = finalNotes ? finalNotes.trim() : '';

        // Cập nhật trạng thái kết quả bảo hành
        claim.warrantyResults.status = 'ready_for_handover';

        // Cập nhật trạng thái claim
        claim.claimStatus = 'ready_for_handover';

        // Đặt audit trail cho thay đổi trạng thái
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Cập nhật thông tin hoàn thành';
        claim._statusChangeNotes = 'Completed repair work and ready for handover';

        // Lưu claim
        await claim.save();

        // Chuẩn bị phản hồi
        const responseData = {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: claim.claimStatus,
            completedBy: userId,
            completedAt: claim.warrantyResults.completionInfo.completedAt,
            warrantyResultsStatus: claim.warrantyResults.status
        };

        return responseHelper.success(res, responseData, "Cập nhật thông tin hoàn thành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'updateCompletionInfo', error, "Lỗi server khi cập nhật thông tin hoàn thành", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * Record Handover
 * Ghi lại thông tin bàn giao xe cho khách hàng
 *
 * @route POST /api/claims/:claimId/results/handover
 * @access technician, service_staff, admin
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
        const userId = req.user.sub;

        // Kiểm tra các trường bắt buộc
        if (!customerName || customerName.trim().length === 0) {
            return responseHelper.error(res, "customerName là bắt buộc", 400);
        }
        if (!customerPhone || customerPhone.trim().length === 0) {
            return responseHelper.error(res, "customerPhone là bắt buộc", 400);
        }
        if (!customerSignature || customerSignature.trim().length === 0) {
            return responseHelper.error(res, "customerSignature là bắt buộc", 400);
        }

        // Kiểm tra tính hợp lệ của các trường
        if (customerName.trim().length > 200) {
            return responseHelper.error(res, "customerName quá dài (tối đa 200 ký tự)", 400);
        }

        // Kiểm tra số điện thoại format (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(customerPhone.trim())) {
            return responseHelper.error(res, "customerPhone phải là 10 số", 400);
        }

        // Kiểm tra tình trạng xe
        const validConditions = ['excellent', 'good', 'fair'];
        if (vehicleCondition && !validConditions.includes(vehicleCondition)) {
            return responseHelper.error(res, `vehicleCondition phải là: ${validConditions.join(', ')}`, 400);
        }

        // Kiểm tra số km
        if (mileageAtHandover !== undefined && (typeof mileageAtHandover !== 'number' || mileageAtHandover < 0)) {
            return responseHelper.error(res, "mileageAtHandover phải là số dương", 400);
        }

        // Kiểm tra độ dài ghi chú
        if (notes && notes.trim().length > 1000) {
            return responseHelper.error(res, "notes quá dài (tối đa 1000 ký tự)", 400);
        }

        // Kiểm tra claim có tồn tại hay không
        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Kiểm tra trạng thái claim phải là ready_for_handover
        if (claim.claimStatus !== 'ready_for_handover') {
            return responseHelper.error(res, "Chỉ có thể ghi bàn giao khi claim ở trạng thái 'ready_for_handover'", 400);
        }

        // Kiểm tra quyền truy cập
        if (claim.serviceCenterId.toString() !== userId && req.user.role !== 'admin') {
            return responseHelper.error(res, "Không có quyền ghi bàn giao cho claim này", 403);
        }

        // Cập nhật thông tin bàn giao
        if (!claim.warrantyResults.handoverInfo) {
            claim.warrantyResults.handoverInfo = {};
        }

        claim.warrantyResults.handoverInfo.handoverDate = new Date();
        claim.warrantyResults.handoverInfo.handedOverBy = userId;
        claim.warrantyResults.handoverInfo.customerName = customerName.trim();
        claim.warrantyResults.handoverInfo.customerPhone = customerPhone.trim();
        claim.warrantyResults.handoverInfo.customerSignature = customerSignature.trim();
        claim.warrantyResults.handoverInfo.vehicleCondition = vehicleCondition || 'good';
        claim.warrantyResults.handoverInfo.mileageAtHandover = mileageAtHandover || 0;
        claim.warrantyResults.handoverInfo.notes = notes ? notes.trim() : '';

        // Cập nhật trạng thái kết quả bảo hành
        claim.warrantyResults.status = 'handed_over';

        // Cập nhật trạng thái claim
        claim.claimStatus = 'handed_over';

        // Đặt audit trail cho thay đổi trạng thái
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Bàn giao xe cho khách hàng';
        claim._statusChangeNotes = `Handed over to customer: ${customerName.trim()}`;

        // Lưu claim
        await claim.save();

        // Chuẩn bị phản hồi
        const responseData = {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: claim.claimStatus,
            handoverDate: claim.warrantyResults.handoverInfo.handoverDate,
            customerName: claim.warrantyResults.handoverInfo.customerName,
            warrantyResultsStatus: claim.warrantyResults.status
        };

        return responseHelper.success(res, responseData, "Ghi lại thông tin bàn giao xe thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'recordHandover', error, "Lỗi server khi ghi bàn giao xe", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * Close Warranty Case
 * Đóng hồ sơ bảo hành
 *
 * @route POST /api/claims/:claimId/results/close
 * @access service_staff, admin
 */
const closeWarrantyCase = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { closureNotes } = req.body;
        const userId = req.user.sub;

        // Chỉ service_staff và admin mới có thể đóng
        if (!['service_staff', 'admin'].includes(req.user.role)) {
            return responseHelper.error(res, "Chỉ service_staff và admin mới có thể đóng hồ sơ bảo hành", 403);
        }

        // Kiểm tra ghi chú đóng hồ sơ
        if (closureNotes && closureNotes.trim().length > 1000) {
            return responseHelper.error(res, "closureNotes quá dài (tối đa 1000 ký tự)", 400);
        }

        // Kiểm tra claim có tồn tại hay không
        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId);

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Kiểm tra trạng thái claim phải là handed_over
        if (claim.claimStatus !== 'handed_over') {
            return responseHelper.error(res, "Chỉ có thể đóng hồ sơ khi claim ở trạng thái 'handed_over'", 400);
        }

        // Phải có đầy đủ thông tin kết quả bảo hành
        if (!claim.warrantyResults) {
            return responseHelper.error(res, "Không có thông tin kết quả bảo hành", 400);
        }

        // Kiểm tra ảnh kết quả
        if (!claim.warrantyResults.resultPhotos || claim.warrantyResults.resultPhotos.length === 0) {
            return responseHelper.error(res, "Phải có ảnh kết quả trước khi đóng hồ sơ", 400);
        }

        // Kiểm tra thông tin hoàn thành
        if (!claim.warrantyResults.completionInfo || !claim.warrantyResults.completionInfo.completedAt) {
            return responseHelper.error(res, "Phải có thông tin hoàn thành trước khi đóng hồ sơ", 400);
        }

        // Kiểm tra thông tin bàn giao
        if (!claim.warrantyResults.handoverInfo || !claim.warrantyResults.handoverInfo.handoverDate) {
            return responseHelper.error(res, "Phải có thông tin bàn giao trước khi đóng hồ sơ", 400);
        }

        // Đóng hồ sơ bảo hành
        claim.warrantyResults.status = 'closed';
        claim.warrantyResults.closedAt = new Date();
        claim.warrantyResults.closedBy = userId;

        // Cập nhật trạng thái claim to completed
        claim.claimStatus = 'completed';
        claim.completedAt = new Date();

        // Đặt audit trail cho thay đổi trạng thái
        claim._statusChangedBy = req.user.email;
        claim._statusChangeReason = 'Đóng hồ sơ bảo hành';
        claim._statusChangeNotes = closureNotes ? closureNotes.trim() : 'Warranty case closed successfully';

        // Lưu claim
        await claim.save();

        // Chuẩn bị phản hồi
        const responseData = {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: claim.claimStatus,
            closedAt: claim.warrantyResults.closedAt,
            closedBy: userId,
            warrantyResultsStatus: claim.warrantyResults.status
        };

        return responseHelper.success(res, responseData, "Đóng hồ sơ bảo hành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'closeWarrantyCase', error, "Lỗi server khi đóng hồ sơ bảo hành", 500, {
            claimId: req.params.claimId
        });
    }
};

/**
 * Get Warranty Results
 * Xem kết quả bảo hành
 *
 * @route GET /api/claims/:claimId/results
 * @access technician, service_staff, admin, oem_staff
 */
const getWarrantyResults = async (req, res) => {
    try {
        const { claimId } = req.params;
        const userId = req.user.sub;

        // Kiểm tra claim có tồn tại hay không
        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId)
            .populate('warrantyResults.completionInfo.completedBy', 'name email')
            .populate('warrantyResults.handoverInfo.handedOverBy', 'name email')
            .populate('warrantyResults.closedBy', 'name email')
            .populate('warrantyResults.resultPhotos.uploadedBy', 'name email');

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Kiểm tra quyền truy cập
        // Nhân viên OEM có thể xem bất kỳ, những người khác chỉ có thể xem claims của trung tâm dịch vụ của họ
        if (req.user.role !== 'admin' && req.user.role !== 'oem_staff') {
            if (claim.serviceCenterId.toString() !== userId) {
                return responseHelper.error(res, "Không có quyền xem kết quả bảo hành của claim này", 403);
            }
        }

        // Chuẩn bị dữ liệu kết quả bảo hành
        const warrantyResults = claim.warrantyResults || {};

        // Định dạng ảnh kết quả
        const resultPhotos = (warrantyResults.resultPhotos || []).map(photo => ({
            url: photo.url,
            description: photo.description,
            uploadedAt: photo.uploadedAt,
            uploadedBy: photo.uploadedBy ? {
                id: photo.uploadedBy._id,
                name: photo.uploadedBy.name,
                email: photo.uploadedBy.email
            } : null
        }));

        // Định dạng thông tin hoàn thành
        const completionInfo = warrantyResults.completionInfo ? {
            completedBy: warrantyResults.completionInfo.completedBy ? {
                id: warrantyResults.completionInfo.completedBy._id,
                name: warrantyResults.completionInfo.completedBy.name,
                email: warrantyResults.completionInfo.completedBy.email
            } : null,
            completedAt: warrantyResults.completionInfo.completedAt,
            finalNotes: warrantyResults.completionInfo.finalNotes,
            workSummary: warrantyResults.completionInfo.workSummary,
            testResults: warrantyResults.completionInfo.testResults
        } : null;

        // Định dạng thông tin bàn giao
        const handoverInfo = warrantyResults.handoverInfo ? {
            handoverDate: warrantyResults.handoverInfo.handoverDate,
            handedOverBy: warrantyResults.handoverInfo.handedOverBy ? {
                id: warrantyResults.handoverInfo.handedOverBy._id,
                name: warrantyResults.handoverInfo.handedOverBy.name,
                email: warrantyResults.handoverInfo.handedOverBy.email
            } : null,
            customerName: warrantyResults.handoverInfo.customerName,
            customerPhone: warrantyResults.handoverInfo.customerPhone,
            vehicleCondition: warrantyResults.handoverInfo.vehicleCondition,
            mileageAtHandover: warrantyResults.handoverInfo.mileageAtHandover,
            notes: warrantyResults.handoverInfo.notes
        } : null;

        // Chuẩn bị phản hồi data
        const responseData = {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            vin: claim.vin,
            status: claim.claimStatus,
            warrantyResults: {
                resultPhotos: resultPhotos,
                completionInfo: completionInfo,
                handoverInfo: handoverInfo,
                status: warrantyResults.status || null,
                closedAt: warrantyResults.closedAt || null,
                closedBy: warrantyResults.closedBy ? {
                    id: warrantyResults.closedBy._id,
                    name: warrantyResults.closedBy.name,
                    email: warrantyResults.closedBy.email
                } : null
            }
        };

        return responseHelper.success(res, responseData, "Lấy thông tin kết quả bảo hành thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getWarrantyResults', error, "Lỗi server khi lấy kết quả bảo hành", 500, {
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
    // Phương thức Phê duyệt/Từ chối
    approveWarrantyClaim,
    rejectWarrantyClaim,
    getClaimsForApproval,
    addApprovalNotes,
    // Phương thức Quản lý Phụ tùng
    shipParts,
    receiveParts,
    getPartsShipmentStatus,
    // Phương thức Quản lý Tiến độ Sửa chữa
    startRepair,
    updateProgressStep,
    reportIssue,
    resolveIssue,
    performQualityCheck,
    completeRepair,
    getRepairProgress,
    getRepairHistory,
    // Phương thức Quản lý Kết quả Bảo hành
    uploadResultPhotos,
    updateCompletionInfo,
    recordHandover,
    closeWarrantyCase,
    getWarrantyResults
};
