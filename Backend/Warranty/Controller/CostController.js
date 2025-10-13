const responseHelper = require('../../shared/utils/responseHelper');
const { handleControllerError } = require('../../shared/utils/errorHelper');
const WarrantyClaimModel = require('../Model/WarrantyClaim');
const mongoose = require('mongoose');

/**
 * UC8 - Cost Management Controller
 * Quản lý chi phí bảo hành
 */

/**
 * Lấy thống kê chi phí bảo hành
 * GET /warranty/costs/statistics
 */
const getCostStatistics = async (req, res) => {
    try {
        // Initialize model
        const WarrantyClaim = WarrantyClaimModel();

        // Simple test version
        const totalClaims = await WarrantyClaim.countDocuments({
            claimStatus: { $in: ['approved', 'completed', 'closed'] }
        });

        const statistics = {
            totalClaims,
            totalEstimatedCost: 0,
            totalApprovedCost: 0,
            totalRepairCost: 0,
            avgEstimatedCost: 0,
            avgApprovedCost: 0,
            avgRepairCost: 0,
            maxCost: 0,
            minCost: 0
        };

        return responseHelper.success(res, {
            statistics,
            filters: req.query
        }, "Lấy thống kê chi phí bảo hành thành công");

    } catch (error) {
        return handleControllerError(
            res,
            "getCostStatistics",
            error,
            "Lỗi server khi lấy thống kê chi phí",
            500,
            { query: req.query }
        );
    }
};

/**
 * Lấy chi phí theo danh mục
 * GET /warranty/costs/by-category
 */
const getCostsByCategory = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const matchConditions = {
            claimStatus: { $in: ['approved', 'completed', 'closed'] }
        };

        // Date range filter
        if (startDate || endDate) {
            matchConditions.createdAt = {};
            if (startDate) {
                matchConditions.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                matchConditions.createdAt.$lte = new Date(endDate);
            }
        }

        const pipeline = [
            { $match: matchConditions },
            {
                $addFields: {
                    estimatedTotalCost: {
                        $reduce: {
                            input: '$partsToReplace',
                            initialValue: 0,
                            in: { $add: ['$$value', { $multiply: [{ $ifNull: ['$$this.estimatedCost', 0] }, { $ifNull: ['$$this.quantity', 1] }] }] }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$issueCategory',
                    totalClaims: { $sum: 1 },
                    totalEstimatedCost: { $sum: '$estimatedTotalCost' },
                    totalApprovedCost: { $sum: { $ifNull: ['$approvedCost', 0] } },
                    totalRepairCost: { $sum: { $ifNull: ['$repairDetails.totalCost', 0] } },
                    avgCost: { $avg: { $ifNull: ['$approvedCost', 0] } }
                }
            },
            { $sort: { totalApprovedCost: -1 } }
        ];

        // Initialize model
        const WarrantyClaim = WarrantyClaimModel();
        const results = await WarrantyClaim.aggregate(pipeline);

        return responseHelper.success(res, {
            costsByCategory: results,
            totalCategories: results.length
        }, "Lấy chi phí theo danh mục thành công");

    } catch (error) {
        return handleControllerError(
            res,
            "getCostsByCategory",
            error,
            "Lỗi server khi lấy chi phí theo danh mục",
            500,
            { query: req.query }
        );
    }
};

/**
 * Lấy chi phí theo trung tâm dịch vụ
 * GET /warranty/costs/by-service-center
 */
const getCostsByServiceCenter = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const matchConditions = {
            claimStatus: { $in: ['approved', 'completed', 'closed'] }
        };

        // Date range filter
        if (startDate || endDate) {
            matchConditions.createdAt = {};
            if (startDate) {
                matchConditions.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                matchConditions.createdAt.$lte = new Date(endDate);
            }
        }

        const pipeline = [
            { $match: matchConditions },
            {
                $group: {
                    _id: '$serviceCenterName',
                    totalClaims: { $sum: 1 },
                    totalEstimatedCost: { $sum: '$estimatedTotalCost' },
                    totalApprovedCost: { $sum: '$approvedCost' },
                    totalRepairCost: { $sum: '$repairDetails.totalCost' },
                    avgCost: { $avg: '$approvedCost' }
                }
            },
            { $sort: { totalApprovedCost: -1 } }
        ];

        // Initialize model
        const WarrantyClaim = WarrantyClaimModel();
        const results = await WarrantyClaim.aggregate(pipeline);

        return responseHelper.success(res, {
            costsByServiceCenter: results,
            totalServiceCenters: results.length
        }, "Lấy chi phí theo trung tâm dịch vụ thành công");

    } catch (error) {
        return handleControllerError(
            res,
            "getCostsByServiceCenter",
            error,
            "Lỗi server khi lấy chi phí theo trung tâm dịch vụ",
            500,
            { query: req.query }
        );
    }
};

/**
 * Lấy xu hướng chi phí theo thời gian
 * GET /warranty/costs/trends
 */
const getCostTrends = async (req, res) => {
    try {
        const { period = 'monthly', year = new Date().getFullYear() } = req.query;

        const matchConditions = {
            claimStatus: { $in: ['approved', 'completed', 'closed'] },
            createdAt: {
                $gte: new Date(`${year}-01-01`),
                $lte: new Date(`${year}-12-31`)
            }
        };

        let groupBy;
        if (period === 'quarterly') {
            groupBy = {
                year: { $year: '$createdAt' },
                quarter: {
                    $ceil: { $divide: [{ $month: '$createdAt' }, 3] }
                }
            };
        } else {
            // Default to monthly
            groupBy = {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
            };
        }

        const pipeline = [
            { $match: matchConditions },
            {
                $group: {
                    _id: groupBy,
                    totalClaims: { $sum: 1 },
                    totalEstimatedCost: { $sum: '$estimatedTotalCost' },
                    totalApprovedCost: { $sum: '$approvedCost' },
                    totalRepairCost: { $sum: '$repairDetails.totalCost' },
                    avgCost: { $avg: '$approvedCost' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.quarter': 1 } }
        ];

        // Initialize model
        const WarrantyClaim = WarrantyClaimModel();
        const results = await WarrantyClaim.aggregate(pipeline);

        return responseHelper.success(res, {
            trends: results,
            period,
            year: parseInt(year),
            totalPeriods: results.length
        }, "Lấy xu hướng chi phí thành công");

    } catch (error) {
        return handleControllerError(
            res,
            "getCostTrends",
            error,
            "Lỗi server khi lấy xu hướng chi phí",
            500,
            { query: req.query }
        );
    }
};

/**
 * Lấy chi tiết chi phí của một claim
 * GET /warranty/costs/claim/:claimId
 */
const getClaimCostDetails = async (req, res) => {
    try {
        const { claimId } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(claimId)) {
            return responseHelper.error(res, "ID yêu cầu bảo hành không hợp lệ", 400);
        }

        // Initialize model
        const WarrantyClaim = WarrantyClaimModel();
        const claim = await WarrantyClaim.findById(claimId)
            .select('claimNumber vin issueCategory claimStatus partsToReplace estimatedTotalCost approvedCost repairDetails createdAt')
            .lean();

        if (!claim) {
            return responseHelper.error(res, "Không tìm thấy yêu cầu bảo hành", 404);
        }

        // Calculate cost breakdown
        const costBreakdown = {
            estimatedCost: claim.estimatedTotalCost || 0,
            approvedCost: claim.approvedCost || 0,
            actualRepairCost: claim.repairDetails?.totalCost || 0,
            laborCost: claim.repairDetails?.totalLaborHours * 500000 || 0, // Assuming 500k per hour
            partsCost: 0
        };

        // Calculate parts cost from partsToReplace
        if (claim.partsToReplace && Array.isArray(claim.partsToReplace)) {
            costBreakdown.partsCost = claim.partsToReplace.reduce((total, part) => {
                return total + (part.estimatedCost || 0) * part.quantity;
            }, 0);
        }

        // Cost variance analysis
        const costVariance = {
            estimatedVsApproved: (claim.approvedCost || 0) - (claim.estimatedTotalCost || 0),
            approvedVsActual: (claim.repairDetails?.totalCost || 0) - (claim.approvedCost || 0),
            estimatedVsActual: (claim.repairDetails?.totalCost || 0) - (claim.estimatedTotalCost || 0)
        };

        return responseHelper.success(res, {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            vin: claim.vin,
            issueCategory: claim.issueCategory,
            claimStatus: claim.claimStatus,
            costBreakdown,
            costVariance,
            partsDetails: claim.partsToReplace,
            repairDetails: claim.repairDetails,
            createdAt: claim.createdAt
        }, "Lấy chi tiết chi phí claim thành công");

    } catch (error) {
        return handleControllerError(
            res,
            "getClaimCostDetails",
            error,
            "Lỗi server khi lấy chi tiết chi phí claim",
            500,
            { claimId: req.params.claimId }
        );
    }
};

module.exports = {
    getCostStatistics,
    getCostsByCategory,
    getCostsByServiceCenter,
    getCostTrends,
    getClaimCostDetails
};
