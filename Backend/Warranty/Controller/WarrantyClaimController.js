const redisService = require("../../shared/services/RedisService");
const { connectToWarrantyDB } = require('../../shared/database/warrantyConnection');

// Models
let WarrantyClaim;
let WarrantyVehicle;
let isInitialized = false;

async function initializeModels() {
    if (!isInitialized) {
        try {
            // Ensure connection is established
            await connectToWarrantyDB();

            // Initialize models
            WarrantyClaim = require('../Model/WarrantyClaim')();
            WarrantyVehicle = require('../Model/WarrantyVehicle')();

            console.log('✅ WarrantyClaim model initialized:', typeof WarrantyClaim);
            console.log('✅ WarrantyVehicle model initialized:', typeof WarrantyVehicle);
            console.log('✅ WarrantyVehicle.findOne:', typeof WarrantyVehicle.findOne);

            isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize models:', error);
            throw error;
        }
    }
}

const createWarrantyClaim = async (req, res) => {
    try {
        console.log('🔧 Starting createWarrantyClaim...');
        await initializeModels();
        console.log('🔧 After initializeModels, WarrantyVehicle type:', typeof WarrantyVehicle);
        const {
            vin,
            customerName,
            customerEmail,
            customerPhone,
            issueDescription,
            issueCategory,
            severity,
            incidentDate,
            mileage,
            serviceCenterName,
            serviceCenterLocation,
            warrantyType
        } = req.body;

        // Validate required fields
        if (!vin || !customerName || !customerEmail || !issueDescription || !issueCategory || !incidentDate || !mileage) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc"
            });
        }

        // Check if vehicle has active warranty
        const warrantyVehicle = await WarrantyVehicle.findOne({ vin });
        if (!warrantyVehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy thông tin bảo hành cho xe này"
            });
        }

        // Check warranty validity
        const now = new Date();
        let warrantyEndDate;
        let warrantyMileageLimit;

        if (warrantyType === 'battery') {
            warrantyEndDate = warrantyVehicle.batteryWarrantyEndDate;
            warrantyMileageLimit = warrantyVehicle.batteryWarrantyMileage;
        } else {
            warrantyEndDate = warrantyVehicle.vehicleWarrantyEndDate;
            warrantyMileageLimit = warrantyVehicle.vehicleWarrantyMileage;
        }

        if (now > warrantyEndDate) {
            return res.status(400).json({
                success: false,
                message: "Bảo hành đã hết hạn"
            });
        }

        if (mileage > warrantyMileageLimit) {
            return res.status(400).json({
                success: false,
                message: "Xe đã vượt quá số km bảo hành"
            });
        }

        // Generate claim number
        const claimNumber = WarrantyClaim.generateClaimNumber();

        // Create warranty claim
        const newClaim = new WarrantyClaim({
            claimNumber,
            vin,
            vehicleModel: warrantyVehicle.modelName,
            vehicleYear: warrantyVehicle.year,
            mileage,
            customerName,
            customerEmail,
            customerPhone,
            issueDescription,
            issueCategory,
            severity: severity || 'medium',
            incidentDate: new Date(incidentDate),
            serviceCenterName,
            serviceCenterLocation,
            warrantyType: warrantyType || 'vehicle',
            warrantyStartDate: warrantyVehicle.warrantyStartDate,
            warrantyEndDate,
            warrantyMileageLimit,
            priority: severity === 'critical' ? 'urgent' : severity === 'high' ? 'high' : 'normal'
        });

        await newClaim.save();

        // Clear cache
        try {
            await redisService.del("warranty:claims:*");
        } catch (cacheError) {
            console.error("Cache clear error:", cacheError);
        }

        res.status(201).json({
            success: true,
            message: "Tạo yêu cầu bảo hành thành công",
            data: newClaim
        });
    } catch (err) {
        console.error("Create warranty claim error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi tạo yêu cầu bảo hành",
            error: err.message
        });
    }
};

const getAllClaims = async (req, res) => {
    try {
        await initializeModels();
        const {
            page = 1,
            limit = 10,
            status,
            issueCategory,
            priority,
            serviceCenterName,
            startDate,
            endDate,
            search
        } = req.query;

        const cacheKey = `warranty:claims:${JSON.stringify(req.query)}`;

        // Try to get from cache
        try {
            const cachedClaims = await redisService.get(cacheKey);
            if (cachedClaims) {
                return res.json({
                    success: true,
                    message: "Lấy danh sách yêu cầu bảo hành thành công (cached)",
                    data: JSON.parse(cachedClaims),
                    cached: true
                });
            }
        } catch (cacheError) {
            console.error("Cache get error:", cacheError);
        }

        // Build filter
        const filter = {};
        if (status) filter.status = status;
        if (issueCategory) filter.issueCategory = issueCategory;
        if (priority) filter.priority = priority;
        if (serviceCenterName) filter.serviceCenterName = serviceCenterName;

        if (startDate || endDate) {
            filter.claimDate = {};
            if (startDate) filter.claimDate.$gte = new Date(startDate);
            if (endDate) filter.claimDate.$lte = new Date(endDate);
        }

        if (search) {
            filter.$or = [
                { claimNumber: { $regex: search, $options: 'i' } },
                { vin: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } }
            ];
        }

        // Get claims with pagination
        const skip = (page - 1) * limit;
        const claims = await WarrantyClaim.find(filter)
            .sort({ claimDate: -1, priority: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await WarrantyClaim.countDocuments(filter);
        const pages = Math.ceil(total / limit);

        const result = {
            claims,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages,
                hasNext: page < pages,
                hasPrev: page > 1
            }
        };

        // Cache result
        try {
            await redisService.set(cacheKey, JSON.stringify(result), 300); // 5 minutes
        } catch (cacheError) {
            console.error("Cache set error:", cacheError);
        }

        res.json({
            success: true,
            message: "Lấy danh sách yêu cầu bảo hành thành công",
            data: result,
            cached: false
        });
    } catch (err) {
        console.error("Get all claims error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách yêu cầu bảo hành",
            error: err.message
        });
    }
};

const getClaimById = async (req, res) => {
    try {
        await initializeModels();
        const { id } = req.params;

        const claim = await WarrantyClaim.findById(id);
        if (!claim) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy yêu cầu bảo hành"
            });
        }

        res.json({
            success: true,
            message: "Lấy thông tin yêu cầu bảo hành thành công",
            data: claim
        });
    } catch (err) {
        console.error("Get claim by ID error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin yêu cầu bảo hành",
            error: err.message
        });
    }
};

const updateClaimStatus = async (req, res) => {
    try {
        await initializeModels();
        const { id } = req.params;
        const { status, reason, reviewedBy } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin trạng thái"
            });
        }

        const claim = await WarrantyClaim.findById(id);
        if (!claim) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy yêu cầu bảo hành"
            });
        }

        // Update status
        claim.status = status;

        if (reviewedBy) {
            claim.reviewedBy = {
                ...reviewedBy,
                date: new Date()
            };
        }

        if (status === 'approved') {
            claim.approvalReason = reason;
        } else if (status === 'rejected') {
            claim.rejectionReason = reason;
        } else if (status === 'completed') {
            claim.resolutionDate = new Date();
            claim.resolutionNotes = reason;
        }

        await claim.save();

        // Clear cache
        try {
            await redisService.del("warranty:claims:*");
        } catch (cacheError) {
            console.error("Cache clear error:", cacheError);
        }

        res.json({
            success: true,
            message: "Cập nhật trạng thái yêu cầu bảo hành thành công",
            data: claim
        });
    } catch (err) {
        console.error("Update claim status error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật trạng thái yêu cầu bảo hành",
            error: err.message
        });
    }
};

const approveClaim = async (req, res) => {
    try {
        await initializeModels();
        const { id } = req.params;
        const { approvedAmount, assignedTechnician, reason, reviewedBy } = req.body;

        const claim = await WarrantyClaim.findById(id);
        if (!claim) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy yêu cầu bảo hành"
            });
        }

        if (claim.status !== 'pending' && claim.status !== 'under_review') {
            return res.status(400).json({
                success: false,
                message: "Chỉ có thể phê duyệt yêu cầu đang chờ xử lý"
            });
        }

        // Update claim
        claim.status = 'approved';
        claim.approvedAmount = approvedAmount || claim.estimatedCost;
        claim.approvalReason = reason;
        claim.reviewedBy = {
            ...reviewedBy,
            date: new Date()
        };

        if (assignedTechnician) {
            claim.assignedTechnician = assignedTechnician;
        }

        await claim.save();

        // Clear cache
        try {
            await redisService.del("warranty:claims:*");
        } catch (cacheError) {
            console.error("Cache clear error:", cacheError);
        }

        res.json({
            success: true,
            message: "Phê duyệt yêu cầu bảo hành thành công",
            data: claim
        });
    } catch (err) {
        console.error("Approve claim error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi phê duyệt yêu cầu bảo hành",
            error: err.message
        });
    }
};

const rejectClaim = async (req, res) => {
    try {
        await initializeModels();
        const { id } = req.params;
        const { reason, reviewedBy } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Cần nhập lý do từ chối"
            });
        }

        const claim = await WarrantyClaim.findById(id);
        if (!claim) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy yêu cầu bảo hành"
            });
        }

        if (claim.status !== 'pending' && claim.status !== 'under_review') {
            return res.status(400).json({
                success: false,
                message: "Chỉ có thể từ chối yêu cầu đang chờ xử lý"
            });
        }

        // Update claim
        claim.status = 'rejected';
        claim.rejectionReason = reason;
        claim.reviewedBy = {
            ...reviewedBy,
            date: new Date()
        };

        await claim.save();

        // Clear cache
        try {
            await redisService.del("warranty:claims:*");
        } catch (cacheError) {
            console.error("Cache clear error:", cacheError);
        }

        res.json({
            success: true,
            message: "Từ chối yêu cầu bảo hành thành công",
            data: claim
        });
    } catch (err) {
        console.error("Reject claim error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi từ chối yêu cầu bảo hành",
            error: err.message
        });
    }
};

const getClaimsByVIN = async (req, res) => {
    try {
        await initializeModels();
        const { vin } = req.params;

        const claims = await WarrantyClaim.find({ vin })
            .sort({ claimDate: -1 });

        res.json({
            success: true,
            message: "Lấy danh sách yêu cầu bảo hành theo VIN thành công",
            data: {
                vin,
                claims,
                total: claims.length
            }
        });
    } catch (err) {
        console.error("Get claims by VIN error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách yêu cầu bảo hành theo VIN",
            error: err.message
        });
    }
};

const getClaimStatistics = async (req, res) => {
    try {
        await initializeModels();
        const cacheKey = "warranty:claims:statistics";

        // Try to get from cache
        try {
            const cachedStats = await redisService.get(cacheKey);
            if (cachedStats) {
                return res.json({
                    success: true,
                    message: "Lấy thống kê yêu cầu bảo hành thành công (cached)",
                    data: JSON.parse(cachedStats),
                    cached: true
                });
            }
        } catch (cacheError) {
            console.error("Cache get error:", cacheError);
        }

        // Get statistics
        const totalClaims = await WarrantyClaim.countDocuments();

        const statusStats = await WarrantyClaim.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const categoryStats = await WarrantyClaim.aggregate([
            { $group: { _id: '$issueCategory', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const priorityStats = await WarrantyClaim.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const approvalRate = await WarrantyClaim.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    approved: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
                        }
                    },
                    rejected: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const avgClaimAmount = await WarrantyClaim.aggregate([
            { $match: { approvedAmount: { $gt: 0 } } },
            { $group: { _id: null, avgAmount: { $avg: '$approvedAmount' } } }
        ]);

        const result = {
            totalClaims,
            byStatus: statusStats,
            byCategory: categoryStats,
            byPriority: priorityStats,
            approvalRate: approvalRate[0] || { total: 0, approved: 0, rejected: 0 },
            averageClaimAmount: avgClaimAmount[0]?.avgAmount || 0,
            lastUpdated: new Date()
        };

        // Cache result
        try {
            await redisService.set(cacheKey, JSON.stringify(result), 600); // 10 minutes
        } catch (cacheError) {
            console.error("Cache set error:", cacheError);
        }

        res.json({
            success: true,
            message: "Lấy thống kê yêu cầu bảo hành thành công",
            data: result,
            cached: false
        });
    } catch (err) {
        console.error("Get claim statistics error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thống kê yêu cầu bảo hành",
            error: err.message
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
    getAllClaims,
    getClaimById,
    updateClaimStatus,
    approveClaim,
    rejectClaim,
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
