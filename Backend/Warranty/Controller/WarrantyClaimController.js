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



module.exports = {
    createWarrantyClaim,
    getAllClaims,
    getClaimById,
    updateClaimStatus,
    approveClaim,
    rejectClaim,
    getClaimsByVIN,
    getClaimStatistics,
    initializeModels
};
