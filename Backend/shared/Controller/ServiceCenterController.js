const responseHelper = require('../utils/responseHelper');
const { handleControllerError } = require('../utils/errorHelper');
const ServiceCenterModel = require('../Model/ServiceCenter');
const redisService = require('../services/RedisService');

/**
 * Service Center Controller
 * Quản lý CRUD cho các trung tâm bảo hành/dịch vụ
 */

/**
 * Tạo trung tâm dịch vụ mới
 * POST /service-centers
 * Role: admin
 */
const createServiceCenter = async (req, res) => {
    try {
        const {
            code,
            name,
            email,
            phone,
            hotline,
            address,
            workingHours,
            capacity,
            specializations,
            certifications,
            serviceArea,
            manager,
            notes,
            establishedDate
        } = req.body;

        // Validation
        if (!name) {
            return responseHelper.error(res, "Tên trung tâm là bắt buộc", 400);
        }

        if (!email) {
            return responseHelper.error(res, "Email l�� bắt buộc", 400);
        }

        if (!phone) {
            return responseHelper.error(res, "Số điện thoại là bắt buộc", 400);
        }

        if (!address || !address.street || !address.district || !address.city || !address.province) {
            return responseHelper.error(res, "Địa chỉ đầy đủ là bắt buộc (street, district, city, province)", 400);
        }

        // Check if code already exists
        if (code) {
            const ServiceCenter = ServiceCenterModel();
            const existing = await ServiceCenter.findByCode(code);
            if (existing) {
                return responseHelper.error(res, `Mã trung tâm ${code} đã tồn tại`, 400);
            }
        }

        // Create service center
        const ServiceCenter = ServiceCenterModel();
        const serviceCenter = new ServiceCenter({
            code: code || `SC${Date.now().toString().slice(-6)}`,
            name,
            email,
            phone,
            hotline,
            address,
            workingHours: workingHours || {},
            capacity: capacity || {},
            specializations: specializations || ['general'],
            certifications: certifications || [],
            serviceArea: serviceArea || {},
            manager,
            notes,
            establishedDate: establishedDate || new Date(),
            status: 'active',
            createdBy: req.user.email
        });

        await serviceCenter.save();

        // Cache the new service center
        try {
            await redisService.cacheServiceCenter(serviceCenter._id.toString(), {
                id: serviceCenter._id,
                code: serviceCenter.code,
                name: serviceCenter.name,
                email: serviceCenter.email,
                phone: serviceCenter.phone,
                address: serviceCenter.fullAddress,
                status: serviceCenter.status
            });
        } catch (cacheError) {
            console.warn('⚠️ Failed to cache service center:', cacheError.message);
        }

        return responseHelper.success(res, {
            id: serviceCenter._id,
            code: serviceCenter.code,
            name: serviceCenter.name,
            email: serviceCenter.email,
            phone: serviceCenter.phone,
            address: serviceCenter.fullAddress,
            status: serviceCenter.status,
            specializations: serviceCenter.specializations,
            createdAt: serviceCenter.createdAt
        }, "Tạo trung tâm dịch vụ thành công", 201);

    } catch (error) {
        return handleControllerError(res, 'createServiceCenter', error, "Lỗi server khi tạo trung tâm dịch vụ", 500);
    }
};

/**
 * Lấy danh sách tất cả trung tâm dịch vụ
 * GET /service-centers
 * Role: admin, oem_staff, service_staff
 */
const getAllServiceCenters = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            province,
            specialization,
            search
        } = req.query;

        const ServiceCenter = ServiceCenterModel();

        // Build query
        const query = {};

        if (status) {
            query.status = status;
        }

        if (province) {
            query['address.province'] = province;
        }

        if (specialization) {
            query.specializations = specialization;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [serviceCenters, total] = await Promise.all([
            ServiceCenter.find(query)
                .select('code name email phone address status specializations rating statistics createdAt')
                .sort({ name: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            ServiceCenter.countDocuments(query)
        ]);

        // Add full address to each center
        serviceCenters.forEach(center => {
            if (center.address) {
                const addr = center.address;
                center.fullAddress = [
                    addr.street,
                    addr.ward,
                    addr.district,
                    addr.city,
                    addr.province,
                    addr.country
                ].filter(Boolean).join(', ');
            }
        });

        const pagination = responseHelper.createPagination(page, limit, total);

        return responseHelper.success(res, {
            serviceCenters,
            pagination,
            summary: {
                total,
                active: await ServiceCenter.countDocuments({ ...query, status: 'active' }),
                inactive: await ServiceCenter.countDocuments({ ...query, status: 'inactive' }),
                suspended: await ServiceCenter.countDocuments({ ...query, status: 'suspended' })
            }
        }, "Lấy danh sách trung tâm dịch vụ thành công");

    } catch (error) {
        return handleControllerError(res, 'getAllServiceCenters', error, "Lỗi server khi lấy danh sách trung t��m dịch vụ", 500);
    }
};

/**
 * Lấy thông tin chi tiết trung tâm dịch vụ
 * GET /service-centers/:id
 * Role: admin, oem_staff, service_staff
 */
const getServiceCenterById = async (req, res) => {
    try {
        const { id } = req.params;

        // Try cache first
        try {
            const cached = await redisService.getServiceCenter(id);
            if (cached) {
                return responseHelper.success(res, JSON.parse(cached), "Lấy thông tin trung tâm dịch vụ thành công (cached)");
            }
        } catch (cacheError) {
            console.warn('⚠️ Cache read failed:', cacheError.message);
        }

        const ServiceCenter = ServiceCenterModel();
        const serviceCenter = await ServiceCenter.findById(id);

        if (!serviceCenter) {
            return responseHelper.error(res, "Không tìm thấy trung tâm dịch vụ", 404);
        }

        // Cache for future requests
        try {
            await redisService.cacheServiceCenter(id, serviceCenter);
        } catch (cacheError) {
            console.warn('⚠️ Failed to cache service center:', cacheError.message);
        }

        return responseHelper.success(res, serviceCenter, "Lấy thông tin trung tâm dịch vụ thành công");

    } catch (error) {
        return handleControllerError(res, 'getServiceCenterById', error, "Lỗi server khi lấy thông tin trung tâm dịch vụ", 500, {
            id: req.params.id
        });
    }
};

/**
 * Lấy trung tâm dịch vụ theo mã
 * GET /service-centers/code/:code
 * Role: admin, oem_staff, service_staff
 */
const getServiceCenterByCode = async (req, res) => {
    try {
        const { code } = req.params;

        const ServiceCenter = ServiceCenterModel();
        const serviceCenter = await ServiceCenter.findByCode(code);

        if (!serviceCenter) {
            return responseHelper.error(res, `Không tìm thấy trung tâm dịch vụ với mã ${code}`, 404);
        }

        return responseHelper.success(res, serviceCenter, "Lấy thông tin trung tâm dịch vụ thành công");

    } catch (error) {
        return handleControllerError(res, 'getServiceCenterByCode', error, "Lỗi server khi lấy thông tin trung tâm dịch vụ", 500, {
            code: req.params.code
        });
    }
};

/**
 * Cập nhật thông tin trung tâm dịch vụ
 * PUT /service-centers/:id
 * Role: admin
 */
const updateServiceCenter = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const ServiceCenter = ServiceCenterModel();
        const serviceCenter = await ServiceCenter.findById(id);

        if (!serviceCenter) {
            return responseHelper.error(res, "Không tìm thấy trung tâm dịch vụ", 404);
        }

        // Update allowed fields
        const allowedFields = [
            'name', 'email', 'phone', 'hotline', 'address',
            'workingHours', 'capacity', 'specializations',
            'certifications', 'serviceArea', 'manager', 'notes'
        ];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                serviceCenter[field] = updateData[field];
            }
        });

        serviceCenter.updatedBy = req.user.email;
        await serviceCenter.save();

        // Invalidate cache
        try {
            await redisService.client.del(`servicecenter:${id}`);
        } catch (cacheError) {
            console.warn('⚠️ Failed to invalidate cache:', cacheError.message);
        }

        return responseHelper.success(res, {
            id: serviceCenter._id,
            code: serviceCenter.code,
            name: serviceCenter.name,
            email: serviceCenter.email,
            phone: serviceCenter.phone,
            address: serviceCenter.fullAddress,
            status: serviceCenter.status,
            updatedAt: serviceCenter.updatedAt
        }, "Cập nhật trung tâm dịch vụ thành công");

    } catch (error) {
        return handleControllerError(res, 'updateServiceCenter', error, "Lỗi server khi cập nhật trung tâm dịch vụ", 500, {
            id: req.params.id
        });
    }
};

/**
 * Cập nhật trạng thái trung tâm dịch vụ
 * PUT /service-centers/:id/status
 * Role: admin
 */
const updateServiceCenterStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        if (!status) {
            return responseHelper.error(res, "Trạng thái là bắt buộc", 400);
        }

        const validStatuses = ['active', 'inactive', 'maintenance', 'suspended'];
        if (!validStatuses.includes(status)) {
            return responseHelper.error(res, "Trạng thái không hợp lệ", 400);
        }

        const ServiceCenter = ServiceCenterModel();
        const serviceCenter = await ServiceCenter.findById(id);

        if (!serviceCenter) {
            return responseHelper.error(res, "Không tìm thấy trung tâm dịch vụ", 404);
        }

        const oldStatus = serviceCenter.status;
        serviceCenter.status = status;
        serviceCenter.updatedBy = req.user.email;

        if (status === 'suspended' && reason) {
            serviceCenter.notes = `Suspended: ${reason}`;
        }

        await serviceCenter.save();

        // Invalidate cache
        try {
            await redisService.client.del(`servicecenter:${id}`);
        } catch (cacheError) {
            console.warn('⚠️ Failed to invalidate cache:', cacheError.message);
        }

        return responseHelper.success(res, {
            id: serviceCenter._id,
            code: serviceCenter.code,
            name: serviceCenter.name,
            oldStatus,
            newStatus: serviceCenter.status,
            updatedAt: serviceCenter.updatedAt
        }, "Cập nhật trạng thái trung tâm dịch vụ thành công");

    } catch (error) {
        return handleControllerError(res, 'updateServiceCenterStatus', error, "Lỗi server khi cập nhật trạng thái", 500, {
            id: req.params.id
        });
    }
};

/**
 * Xóa trung tâm dịch vụ (soft delete)
 * DELETE /service-centers/:id
 * Role: admin
 */
const deleteServiceCenter = async (req, res) => {
    try {
        const { id } = req.params;

        const ServiceCenter = ServiceCenterModel();
        const serviceCenter = await ServiceCenter.findById(id);

        if (!serviceCenter) {
            return responseHelper.error(res, "Không tìm thấy trung tâm dịch vụ", 404);
        }

        // Soft delete by setting status to inactive
        serviceCenter.status = 'inactive';
        serviceCenter.updatedBy = req.user.email;
        serviceCenter.notes = `Deleted by ${req.user.email} at ${new Date().toISOString()}`;
        await serviceCenter.save();

        // Invalidate cache
        try {
            await redisService.client.del(`servicecenter:${id}`);
        } catch (cacheError) {
            console.warn('⚠️ Failed to invalidate cache:', cacheError.message);
        }

        return responseHelper.success(res, {
            id: serviceCenter._id,
            code: serviceCenter.code,
            name: serviceCenter.name,
            status: serviceCenter.status
        }, "Xóa trung tâm dịch vụ thành công");

    } catch (error) {
        return handleControllerError(res, 'deleteServiceCenter', error, "Lỗi server khi xóa trung tâm dịch vụ", 500, {
            id: req.params.id
        });
    }
};

/**
 * Lấy thống kê trung tâm dịch vụ
 * GET /service-centers/statistics/overview
 * Role: admin, oem_staff
 */
const getServiceCenterStatistics = async (req, res) => {
    try {
        const ServiceCenter = ServiceCenterModel();
        
        const [
            totalCenters,
            activeCenters,
            inactiveCenters,
            suspendedCenters,
            stats
        ] = await Promise.all([
            ServiceCenter.countDocuments(),
            ServiceCenter.countDocuments({ status: 'active' }),
            ServiceCenter.countDocuments({ status: 'inactive' }),
            ServiceCenter.countDocuments({ status: 'suspended' }),
            ServiceCenter.getStatistics()
        ]);

        // Get top rated centers
        const topRated = await ServiceCenter.find({ status: 'active' })
            .sort({ 'rating.average': -1 })
            .limit(5)
            .select('code name rating statistics')
            .lean();

        // Get centers by province
        const byProvince = await ServiceCenter.aggregate([
            {
                $group: {
                    _id: '$address.province',
                    count: { $sum: 1 },
                    active: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return responseHelper.success(res, {
            overview: {
                total: totalCenters,
                active: activeCenters,
                inactive: inactiveCenters,
                suspended: suspendedCenters
            },
            topRated,
            byProvince,
            detailedStats: stats
        }, "Lấy thống kê trung tâm dịch vụ thành công");

    } catch (error) {
        return handleControllerError(res, 'getServiceCenterStatistics', error, "Lỗi server khi lấy thống kê", 500);
    }
};

/**
 * Lấy danh sách trung tâm dịch vụ active (cho dropdown)
 * GET /service-centers/active/list
 * Role: all authenticated users
 */
const getActiveServiceCenters = async (req, res) => {
    try {
        const ServiceCenter = ServiceCenterModel();
        
        const serviceCenters = await ServiceCenter.findActive()
            .select('_id code name phone email address.city address.province')
            .lean();

        return responseHelper.success(res, {
            serviceCenters: serviceCenters.map(sc => ({
                id: sc._id,
                code: sc.code,
                name: sc.name,
                phone: sc.phone,
                email: sc.email,
                location: `${sc.address?.city || ''}, ${sc.address?.province || ''}`
            }))
        }, "Lấy danh sách trung tâm dịch vụ active thành công");

    } catch (error) {
        return handleControllerError(res, 'getActiveServiceCenters', error, "Lỗi server khi lấy danh sách trung tâm active", 500);
    }
};

module.exports = {
    createServiceCenter,
    getAllServiceCenters,
    getServiceCenterById,
    getServiceCenterByCode,
    updateServiceCenter,
    updateServiceCenterStatus,
    deleteServiceCenter,
    getServiceCenterStatistics,
    getActiveServiceCenters
};
