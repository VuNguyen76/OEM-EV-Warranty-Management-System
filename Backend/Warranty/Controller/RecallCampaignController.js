const RecallCampaignModel = require('../Model/RecallCampaign');
const VehicleLookupService = require('../../shared/services/VehicleLookupService');
const CampaignCodeGenerator = require('../../shared/services/CampaignCodeGenerator');
const responseHelper = require('../../shared/utils/responseHelper');

const vehicleLookupService = new VehicleLookupService();
const campaignCodeGenerator = new CampaignCodeGenerator();

// Helper function to find campaign by ID (handles both ObjectId and String)
const findCampaignById = async (campaignId) => {
    const RecallCampaign = RecallCampaignModel();

    try {
        // Try multiple approaches to find the campaign
        let campaign = null;

        // Approach 1: Standard findById (works for 24-char ObjectId)
        if (campaignId.length === 24) {
            try {
                campaign = await RecallCampaign.findById(campaignId);
                if (campaign) {
                    return campaign;
                }
            } catch (err) {
                // Continue to next approach
            }
        }

        // Approach 2: Try findById anyway (maybe Mongoose can handle non-24-char)
        try {
            campaign = await RecallCampaign.findById(campaignId);
            if (campaign) {
                return campaign;
            }
        } catch (err) {
            // Continue to next approach
        }

        // Approach 3: Try findOne with _id
        try {
            campaign = await RecallCampaign.findOne({ _id: campaignId });
            if (campaign) {
                return campaign;
            }
        } catch (err) {
            // Continue to next approach
        }

        // Approach 4: Try findOne with campaignId field (if exists)
        try {
            campaign = await RecallCampaign.findOne({ campaignId: campaignId });
            if (campaign) {
                return campaign;
            }
        } catch (err) {
            // Continue to next approach
        }

        // Approach 5: If campaignId looks like RC-YYYY-NNN, try finding by campaignCode
        if (campaignId.startsWith('RC-')) {
            try {
                campaign = await RecallCampaign.findOne({ campaignCode: campaignId });
                if (campaign) {
                    return campaign;
                }
            } catch (err) {
                // Continue to next approach
            }
        }

        // Approach 6: Try to find by any field that might match
        try {
            const allCampaigns = await RecallCampaign.find({}).limit(20);

            // Look for campaign with matching _id or campaignId
            for (const c of allCampaigns) {
                if (c._id.toString() === campaignId || c.campaignId === campaignId) {
                    return c;
                }
            }
        } catch (err) {
            // Continue to next approach
        }

        return null;

    } catch (error) {
        return null; // Return null instead of throwing
    }
};

/**
 * UC12: Tạo chiến dịch recall (draft)
 * POST /recalls/campaigns
 * Role: oem_staff, admin
 */
const createCampaign = async (req, res) => {
    try {
        const {
            campaignName,
            campaignType,
            severity,
            issueDescription,
            issueCategory,
            potentialRisk,
            rootCause,
            affectedCriteria,
            solution,
            notification,
            schedule
        } = req.body;

        // Validation
        if (!campaignName) {
            return responseHelper.error(res, "Tên chiến dịch là bắt buộc", 400);
        }

        if (!campaignType) {
            return responseHelper.error(res, "Loại chiến dịch là bắt buộc", 400);
        }

        if (!severity) {
            return responseHelper.error(res, "Mức độ nghiêm trọng là bắt buộc", 400);
        }

        if (!issueDescription) {
            return responseHelper.error(res, "Mô tả vấn đề là bắt buộc", 400);
        }

        if (!issueCategory) {
            return responseHelper.error(res, "Danh mục vấn đề là bắt buộc", 400);
        }

        if (!affectedCriteria) {
            return responseHelper.error(res, "Tiêu chí xe bị ảnh hưởng là bắt buộc", 400);
        }

        if (!solution || !solution.description) {
            return responseHelper.error(res, "Mô tả giải pháp là bắt buộc", 400);
        }

        if (!notification || !notification.title || !notification.message || !notification.urgency) {
            return responseHelper.error(res, "Thông tin thông báo đầy đủ là bắt buộc", 400);
        }

        if (!schedule || !schedule.startDate || !schedule.endDate) {
            return responseHelper.error(res, "Lịch trình bắt đầu và kết thúc là bắt buộc", 400);
        }

        // Validate dates
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);

        if (startDate >= endDate) {
            return responseHelper.error(res, "Ngày bắt đầu phải trước ngày kết thúc", 400);
        }

        // Validate severity and urgency match
        if (severity === 'critical' && notification.urgency !== 'immediate') {
            return responseHelper.error(res, "Mức độ nghiêm trọng critical phải có urgency immediate", 400);
        }

        // Validate affected criteria
        const criteriaValidation = vehicleLookupService.validateCriteria(affectedCriteria);
        if (!criteriaValidation.valid) {
            return responseHelper.error(res, criteriaValidation.errors.join(', '), 400);
        }

        // Generate campaign code
        const RecallCampaign = RecallCampaignModel();
        const campaignCode = await campaignCodeGenerator.generateUniqueCode(
            (query, options) => RecallCampaign.findOne(query, null, options),
            (query) => RecallCampaign.findOne(query)
        );

        // Create campaign
        const campaign = new RecallCampaign({
            campaignCode,
            campaignName,
            campaignType,
            severity,
            issueDescription,
            issueCategory,
            potentialRisk,
            rootCause,
            affectedCriteria,
            solution,
            notification,
            schedule: {
                startDate,
                endDate
            },
            status: 'draft',
            createdBy: req.user.email,
            createdByRole: req.user.role
        });

        await campaign.save();

        return responseHelper.success(res, {
            campaignId: campaign._id,
            campaignCode: campaign.campaignCode,
            campaignName: campaign.campaignName,
            status: campaign.status,
            createdAt: campaign.createdAt,
            createdBy: campaign.createdBy
        }, "Tạo chiến dịch recall thành công (draft)");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'createCampaign', error, "Lỗi server khi tạo chiến dịch recall", 500, {
            campaignName: req.body.campaignName
        });
    }
};

/**
 * UC12: Tìm xe bị ảnh hưởng
 * POST /recalls/campaigns/:campaignId/find-affected-vehicles
 * Role: oem_staff, admin
 */
const findAffectedVehicles = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { dryRun = false } = req.body;

        const campaign = await findCampaignById(campaignId);

        if (!campaign) {
            return responseHelper.error(res, "Không tìm thấy chiến dịch recall", 404);
        }

        // Business logic validation
        if (campaign.status !== 'draft') {
            return responseHelper.error(res, "Chỉ có thể tìm xe cho chiến dịch ở trạng thái draft", 400);
        }

        // Find affected vehicles
        const authToken = req.headers.authorization?.replace('Bearer ', '');
        const affectedVehicles = await vehicleLookupService.findAffectedVehicles(campaign.affectedCriteria, authToken);

        // Generate statistics
        const breakdown = {
            byModel: vehicleLookupService.getStatisticsByModel(affectedVehicles),
            byServiceCenter: vehicleLookupService.getStatisticsByServiceCenter(affectedVehicles)
        };

        // If not dry run, save to campaign
        if (!dryRun) {
            campaign.affectedVehicles = affectedVehicles;
            campaign.updateStatistics();
            campaign.updatedBy = req.user.email;
            await campaign.save();
        }

        return responseHelper.success(res, {
            campaignId: campaign._id,
            totalAffectedVehicles: affectedVehicles.length,
            affectedVehicles: affectedVehicles.slice(0, 10), // Return first 10 for preview
            breakdown,
            dryRun
        }, `Tìm thấy ${affectedVehicles.length} xe bị ảnh hưởng`);

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'findAffectedVehicles', error, "Lỗi server khi tìm xe bị ảnh hưởng", 500, {
            campaignId: req.params.campaignId
        });
    }
};

/**
 * UC12: Phát hành chiến dịch
 * POST /recalls/campaigns/:campaignId/publish
 * Role: oem_staff, admin
 */
const publishCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { confirmAffectedVehicles = false, notifyServiceCenters = false } = req.body;

        const campaign = await findCampaignById(campaignId);

        if (!campaign) {
            return responseHelper.error(res, "Không tìm thấy chiến dịch recall", 404);
        }

        // Business logic validation
        if (campaign.status !== 'draft') {
            return responseHelper.error(res, "Chỉ có thể phát hành chiến dịch ở trạng thái draft", 400);
        }

        if (!confirmAffectedVehicles) {
            return responseHelper.error(res, "Phải xác nhận danh sách xe bị ảnh hưởng", 400);
        }

        if (campaign.affectedVehicles.length === 0) {
            return responseHelper.error(res, "Chưa tìm xe bị ảnh hưởng cho chiến dịch", 400);
        }

        // Update campaign status
        campaign.status = 'active';
        campaign.publishedBy = req.user.email;
        campaign.publishedAt = new Date();
        campaign.schedule.actualStartDate = new Date();
        campaign.updatedBy = req.user.email;

        await campaign.save();

        // Count unique service centers
        const serviceCenters = new Set(campaign.affectedVehicles.map(v => v.serviceCenterId));

        return responseHelper.success(res, {
            campaignId: campaign._id,
            campaignCode: campaign.campaignCode,
            status: campaign.status,
            publishedAt: campaign.publishedAt,
            publishedBy: campaign.publishedBy,
            totalAffectedVehicles: campaign.statistics.totalAffectedVehicles,
            serviceCentersNotified: serviceCenters.size
        }, "Phát hành chiến dịch recall thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'publishCampaign', error, "Lỗi server khi phát hành chiến dịch", 500, {
            campaignId: req.params.campaignId
        });
    }
};

/**
 * UC12: Cập nhật chiến dịch
 * PUT /recalls/campaigns/:campaignId
 * Role: oem_staff, admin
 */
const updateCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const updates = req.body;

        const campaign = await findCampaignById(campaignId);

        if (!campaign) {
            return responseHelper.error(res, "Không tìm thấy chiến dịch recall", 404);
        }

        // Business logic validation
        if (!campaign.isEditable) {
            return responseHelper.error(res, "Chỉ có thể cập nhật chiến dịch ở trạng thái draft hoặc scheduled", 400);
        }

        // Update allowed fields
        const allowedFields = [
            'campaignName', 'issueDescription', 'potentialRisk', 'rootCause',
            'solution', 'notification', 'schedule'
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'schedule' && updates[field]) {
                    // Validate dates if updating schedule
                    if (updates[field].startDate && updates[field].endDate) {
                        const startDate = new Date(updates[field].startDate);
                        const endDate = new Date(updates[field].endDate);

                        if (startDate >= endDate) {
                            throw new Error('Ngày bắt đầu phải trước ngày kết thúc');
                        }
                    }
                }
                campaign[field] = updates[field];
            }
        });

        campaign.updatedBy = req.user.email;
        await campaign.save();

        return responseHelper.success(res, {
            campaignId: campaign._id,
            campaignCode: campaign.campaignCode,
            campaignName: campaign.campaignName,
            status: campaign.status,
            updatedAt: campaign.updatedAt,
            updatedBy: campaign.updatedBy
        }, "Cập nhật chiến dịch thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'updateCampaign', error, "Lỗi server khi cập nhật chiến dịch", 500, {
            campaignId: req.params.campaignId
        });
    }
};

/**
 * UC12: Hủy chiến dịch
 * POST /recalls/campaigns/:campaignId/cancel
 * Role: oem_staff, admin
 */
const cancelCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { cancellationReason } = req.body;

        if (!cancellationReason) {
            return responseHelper.error(res, "Lý do hủy chiến dịch là bắt buộc", 400);
        }

        const campaign = await findCampaignById(campaignId);

        if (!campaign) {
            return responseHelper.error(res, "Không tìm thấy chiến dịch recall", 404);
        }

        // Business logic validation
        if (!campaign.isCancellable) {
            return responseHelper.error(res, "Không thể hủy chiến dịch ở trạng thái hiện tại", 400);
        }

        // Update campaign status
        campaign.status = 'cancelled';
        campaign.cancelledBy = req.user.email;
        campaign.cancelledAt = new Date();
        campaign.cancellationReason = cancellationReason;
        campaign.updatedBy = req.user.email;

        await campaign.save();

        return responseHelper.success(res, {
            campaignId: campaign._id,
            campaignCode: campaign.campaignCode,
            status: campaign.status,
            cancelledAt: campaign.cancelledAt,
            cancelledBy: campaign.cancelledBy,
            cancellationReason: campaign.cancellationReason
        }, "Hủy chiến dịch thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'cancelCampaign', error, "Lỗi server khi hủy chiến dịch", 500, {
            campaignId: req.params.campaignId
        });
    }
};

/**
 * UC12: Lấy danh sách chiến dịch
 * GET /recalls/campaigns
 * Role: oem_staff, admin, service_staff
 */
const getCampaigns = async (req, res) => {
    try {
        const {
            status,
            severity,
            campaignType,
            page = 1,
            limit = 10
        } = req.query;

        const RecallCampaign = RecallCampaignModel();

        // Build filter
        const filter = {};
        if (status) filter.status = status;
        if (severity) filter.severity = severity;
        if (campaignType) filter.campaignType = campaignType;

        // For service_staff, only show active campaigns
        if (req.user.role === 'service_staff') {
            filter.status = { $in: ['active', 'in_progress'] };
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await RecallCampaign.countDocuments(filter);

        const campaigns = await RecallCampaign.find(filter)
            .select('campaignCode campaignName campaignType severity status statistics schedule createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        };

        return responseHelper.success(res, {
            campaigns: campaigns.map(campaign => ({
                campaignId: campaign._id,
                campaignCode: campaign.campaignCode,
                campaignName: campaign.campaignName,
                campaignType: campaign.campaignType,
                severity: campaign.severity,
                status: campaign.status,
                totalAffectedVehicles: campaign.statistics.totalAffectedVehicles,
                completionRate: campaign.statistics.completionRate,
                startDate: campaign.schedule.startDate,
                endDate: campaign.schedule.endDate,
                createdAt: campaign.createdAt
            })),
            pagination
        }, "Lấy danh sách chiến dịch thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getCampaigns', error, "Lỗi server khi lấy danh sách chiến dịch", 500);
    }
};

/**
 * UC12: Lấy chi tiết chiến dịch
 * GET /recalls/campaigns/:campaignId
 * Role: oem_staff, admin, service_staff
 */
const getCampaignById = async (req, res) => {
    try {
        const { campaignId } = req.params;

        const campaign = await findCampaignById(campaignId);

        if (!campaign) {
            return responseHelper.error(res, "Không tìm thấy chiến dịch recall", 404);
        }

        // For service_staff, only show active campaigns
        if (req.user.role === 'service_staff' && !['active', 'in_progress'].includes(campaign.status)) {
            return responseHelper.error(res, "Không có quyền xem chiến dịch này", 403);
        }

        return responseHelper.success(res, {
            campaignId: campaign._id,
            campaignCode: campaign.campaignCode,
            campaignName: campaign.campaignName,
            campaignType: campaign.campaignType,
            severity: campaign.severity,
            status: campaign.status,
            issueDescription: campaign.issueDescription,
            issueCategory: campaign.issueCategory,
            potentialRisk: campaign.potentialRisk,
            rootCause: campaign.rootCause,
            affectedCriteria: campaign.affectedCriteria,
            solution: campaign.solution,
            notification: campaign.notification,
            schedule: campaign.schedule,
            statistics: campaign.statistics,
            affectedVehicles: campaign.affectedVehicles.slice(0, 50), // Limit for performance
            createdBy: campaign.createdBy,
            createdAt: campaign.createdAt,
            publishedBy: campaign.publishedBy,
            publishedAt: campaign.publishedAt,
            updatedAt: campaign.updatedAt
        }, "Lấy chi tiết chiến dịch thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getCampaignById', error, "Lỗi server khi lấy chi tiết chiến dịch", 500, {
            campaignId: req.params.campaignId
        });
    }
};

/**
 * UC12: Lấy xe bị ảnh hưởng theo service center
 * GET /recalls/campaigns/:campaignId/affected-vehicles/my-center
 * Role: service_staff, admin
 */
const getAffectedVehiclesByServiceCenter = async (req, res) => {
    try {
        const { campaignId } = req.params;

        const campaign = await findCampaignById(campaignId);

        if (!campaign) {
            return responseHelper.error(res, "Không tìm thấy chiến dịch recall", 404);
        }

        // For service_staff, only show active campaigns
        if (req.user.role === 'service_staff' && !['active', 'in_progress'].includes(campaign.status)) {
            return responseHelper.error(res, "Không có quyền xem chiến dịch này", 403);
        }

        // For service_staff, filter by their service center
        // Note: In real system, we would get serviceCenterId from user profile
        let affectedVehicles = campaign.affectedVehicles;

        if (req.user.role === 'service_staff') {
            // For demo, we'll show all vehicles. In real system:
            // const userServiceCenterId = req.user.serviceCenterId;
            // affectedVehicles = campaign.affectedVehicles.filter(v => v.serviceCenterId.toString() === userServiceCenterId);
        }

        // Calculate statistics
        const statistics = {
            total: affectedVehicles.length,
            pending: affectedVehicles.filter(v => v.status === 'pending').length,
            notified: affectedVehicles.filter(v => v.status === 'notified').length,
            scheduled: affectedVehicles.filter(v => v.status === 'scheduled').length,
            in_progress: affectedVehicles.filter(v => v.status === 'in_progress').length,
            completed: affectedVehicles.filter(v => v.status === 'completed').length,
            declined: affectedVehicles.filter(v => v.status === 'declined').length
        };

        return responseHelper.success(res, {
            campaignId: campaign._id,
            campaignCode: campaign.campaignCode,
            campaignName: campaign.campaignName,
            serviceCenterId: affectedVehicles[0]?.serviceCenterId || null,
            serviceCenterName: affectedVehicles[0]?.serviceCenterName || 'Unknown',
            affectedVehicles: affectedVehicles.map(vehicle => ({
                vin: vehicle.vin,
                model: vehicle.model,
                productionDate: vehicle.productionDate,
                status: vehicle.status,
                notifiedAt: vehicle.notifiedAt,
                scheduledDate: vehicle.scheduledDate,
                completedAt: vehicle.completedAt,
                notes: vehicle.notes
            })),
            statistics
        }, "Lấy danh sách xe bị ảnh hưởng thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getAffectedVehiclesByServiceCenter', error, "Lỗi server khi lấy xe bị ảnh hưởng", 500, {
            campaignId: req.params.campaignId
        });
    }
};

/**
 * UC12: Cập nhật trạng thái xe
 * PUT /recalls/campaigns/:campaignId/vehicles/:vin/status
 * Role: service_staff, admin
 */
const updateVehicleStatus = async (req, res) => {
    try {
        const { campaignId, vin } = req.params;
        const { status, scheduledDate, completedAt, notes } = req.body;

        if (!status) {
            return responseHelper.error(res, "Trạng thái xe là bắt buộc", 400);
        }

        const validStatuses = ['pending', 'notified', 'scheduled', 'in_progress', 'completed', 'declined'];
        if (!validStatuses.includes(status)) {
            return responseHelper.error(res, "Trạng thái xe không hợp lệ", 400);
        }

        const campaign = await findCampaignById(campaignId);

        if (!campaign) {
            return responseHelper.error(res, "Không tìm thấy chiến dịch recall", 404);
        }

        // Find vehicle in campaign
        const vehicleIndex = campaign.affectedVehicles.findIndex(v => v.vin === vin);
        if (vehicleIndex === -1) {
            return responseHelper.error(res, "Không tìm thấy xe trong chiến dịch", 404);
        }

        // Update vehicle status
        const vehicle = campaign.affectedVehicles[vehicleIndex];
        vehicle.status = status;
        vehicle.notes = notes || vehicle.notes;

        // Set timestamps based on status
        if (status === 'notified' && !vehicle.notifiedAt) {
            vehicle.notifiedAt = new Date();
        }
        if (status === 'scheduled' && scheduledDate) {
            vehicle.scheduledDate = new Date(scheduledDate);
        }
        if (status === 'completed' && completedAt) {
            vehicle.completedAt = new Date(completedAt);
        } else if (status === 'completed' && !vehicle.completedAt) {
            vehicle.completedAt = new Date();
        }

        // Update campaign statistics
        campaign.updateStatistics();
        campaign.updatedBy = req.user.email;

        // Update campaign status if all vehicles completed
        if (campaign.statistics.totalCompleted === campaign.statistics.totalAffectedVehicles) {
            campaign.status = 'completed';
            campaign.schedule.actualEndDate = new Date();
        } else if (campaign.statistics.totalInProgress > 0 && campaign.status === 'active') {
            campaign.status = 'in_progress';
        }

        await campaign.save();

        return responseHelper.success(res, {
            campaignId: campaign._id,
            vin: vehicle.vin,
            status: vehicle.status,
            notifiedAt: vehicle.notifiedAt,
            scheduledDate: vehicle.scheduledDate,
            completedAt: vehicle.completedAt,
            notes: vehicle.notes,
            campaignStatus: campaign.status,
            statistics: campaign.statistics
        }, "Cập nhật trạng thái xe thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'updateVehicleStatus', error, "Lỗi server khi cập nhật trạng thái xe", 500, {
            campaignId: req.params.campaignId,
            vin: req.params.vin
        });
    }
};

/**
 * UC12: Thống kê chiến dịch
 * GET /recalls/campaigns/:campaignId/statistics
 * Role: oem_staff, admin
 */
const getCampaignStatistics = async (req, res) => {
    try {
        const { campaignId } = req.params;

        const campaign = await findCampaignById(campaignId);

        if (!campaign) {
            return responseHelper.error(res, "Không tìm thấy chiến dịch recall", 404);
        }

        // Calculate overall statistics
        const overall = {
            totalAffectedVehicles: campaign.statistics.totalAffectedVehicles,
            totalCompleted: campaign.statistics.totalCompleted,
            totalInProgress: campaign.statistics.totalInProgress,
            totalPending: campaign.statistics.totalPending,
            completionRate: campaign.statistics.completionRate
        };

        // Calculate average completion time for completed vehicles
        const completedVehicles = campaign.affectedVehicles.filter(v => v.status === 'completed' && v.completedAt);
        if (completedVehicles.length > 0) {
            const totalTime = completedVehicles.reduce((sum, vehicle) => {
                const startTime = vehicle.notifiedAt || campaign.publishedAt || campaign.createdAt;
                const endTime = vehicle.completedAt;
                return sum + (new Date(endTime) - new Date(startTime));
            }, 0);
            overall.averageCompletionTime = Math.round(totalTime / completedVehicles.length / (1000 * 60 * 60 * 24)); // days
        } else {
            overall.averageCompletionTime = 0;
        }

        // Statistics by service center
        const serviceCenterStats = {};
        campaign.affectedVehicles.forEach(vehicle => {
            const centerName = vehicle.serviceCenterName || 'Unknown';
            if (!serviceCenterStats[centerName]) {
                serviceCenterStats[centerName] = {
                    serviceCenterId: vehicle.serviceCenterId,
                    serviceCenterName: centerName,
                    total: 0,
                    completed: 0,
                    in_progress: 0,
                    pending: 0,
                    completionRate: 0
                };
            }

            serviceCenterStats[centerName].total++;
            if (vehicle.status === 'completed') serviceCenterStats[centerName].completed++;
            if (vehicle.status === 'in_progress') serviceCenterStats[centerName].in_progress++;
            if (vehicle.status === 'pending') serviceCenterStats[centerName].pending++;
        });

        // Calculate completion rates for service centers
        Object.values(serviceCenterStats).forEach(center => {
            if (center.total > 0) {
                center.completionRate = Math.round((center.completed / center.total) * 100);
            }
        });

        // Statistics by status
        const byStatus = {
            pending: campaign.affectedVehicles.filter(v => v.status === 'pending').length,
            notified: campaign.affectedVehicles.filter(v => v.status === 'notified').length,
            scheduled: campaign.affectedVehicles.filter(v => v.status === 'scheduled').length,
            in_progress: campaign.affectedVehicles.filter(v => v.status === 'in_progress').length,
            completed: campaign.affectedVehicles.filter(v => v.status === 'completed').length,
            declined: campaign.affectedVehicles.filter(v => v.status === 'declined').length
        };

        // Timeline data (completion by date)
        const timeline = [];
        const completionsByDate = {};

        completedVehicles.forEach(vehicle => {
            const date = new Date(vehicle.completedAt).toISOString().split('T')[0];
            completionsByDate[date] = (completionsByDate[date] || 0) + 1;
        });

        Object.entries(completionsByDate).forEach(([date, completed]) => {
            timeline.push({ date, completed });
        });

        timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

        return responseHelper.success(res, {
            campaignId: campaign._id,
            campaignCode: campaign.campaignCode,
            overall,
            byServiceCenter: Object.values(serviceCenterStats),
            byStatus,
            timeline
        }, "Lấy thống kê chiến dịch thành công");

    } catch (error) {
        const { handleControllerError } = require('../../shared/utils/errorHelper');
        return handleControllerError(res, 'getCampaignStatistics', error, "Lỗi server khi lấy thống kê chiến dịch", 500, {
            campaignId: req.params.campaignId
        });
    }
};

module.exports = {
    createCampaign,
    findAffectedVehicles,
    publishCampaign,
    updateCampaign,
    cancelCampaign,
    getCampaigns,
    getCampaignById,
    getAffectedVehiclesByServiceCenter,
    updateVehicleStatus,
    getCampaignStatistics
};
