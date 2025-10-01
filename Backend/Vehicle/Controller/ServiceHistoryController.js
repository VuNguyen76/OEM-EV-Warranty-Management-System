const express = require("express");
const Vehicle = require("../Model/Vehicle");
const { authenticateToken, authorizeRole } = require("../../shared/middleware/AuthMiddleware");
const redisService = require("../../shared/services/RedisService");

const router = express.Router();

// UC3: Lưu lịch sử dịch vụ (Nhân viên & Kỹ thuật viên trung tâm dịch vụ)
router.post("/:vehicleId/service-history", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const {
            serviceType,
            description,
            serviceDate,
            mileage,
            serviceCenterName,
            partsReplaced,
            cost,
            attachments,
            notes
        } = req.body;

        // Validate required fields
        if (!serviceType || !description) {
            return res.status(400).json({
                success: false,
                message: "Loại dịch vụ và mô tả là bắt buộc"
            });
        }

        // Find vehicle
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Validate mileage if provided
        if (mileage && mileage < vehicle.currentMileage) {
            return res.status(400).json({
                success: false,
                message: "Số km dịch vụ không thể nhỏ hơn số km hiện tại của xe"
            });
        }

        // Create service history data
        const serviceHistoryData = {
            serviceType,
            description: description.trim(),
            serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
            mileage: mileage || vehicle.currentMileage,
            serviceCenterName: serviceCenterName || vehicle.assignedServiceCenter,
            technicianId: req.user.userId,
            partsReplaced: partsReplaced || [],
            cost: cost || 0,
            attachments: attachments || [],
            notes: notes?.trim(),
            status: 'completed'
        };

        // Add service record to vehicle
        await vehicle.addServiceRecord(serviceHistoryData);

        // Update vehicle mileage if provided and higher
        if (mileage && mileage > vehicle.currentMileage) {
            vehicle.currentMileage = mileage;
            await vehicle.save();
        }

        // Update parts status if parts were replaced
        if (partsReplaced && partsReplaced.length > 0) {
            for (const replacedPart of partsReplaced) {
                if (replacedPart.oldSerialNumber) {
                    const part = vehicle.parts.find(p => p.serialNumber === replacedPart.oldSerialNumber);
                    if (part) {
                        part.status = 'replaced';
                        part.updatedAt = new Date();
                    }
                }
            }
            await vehicle.save();
        }

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`service_history:vehicle:${vehicleId}`);
        if (vehicle.assignedServiceCenter) {
            await redisService.del(`service_history:center:${vehicle.assignedServiceCenter}`);
        }

        console.log(`📋 Service record added to vehicle ${vehicle.vin} by ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: "Lưu lịch sử dịch vụ thành công",
            data: {
                vehicleVin: vehicle.vin,
                serviceType: serviceHistoryData.serviceType,
                serviceDate: serviceHistoryData.serviceDate,
                mileage: serviceHistoryData.mileage
            }
        });

    } catch (err) {
        console.error("Add service history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lưu lịch sử dịch vụ",
            error: err.message
        });
    }
});

// Get service history of a vehicle
router.get("/:vehicleId/service-history", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { serviceType, page = 1, limit = 20 } = req.query;

        // Check cache first
        const cacheKey = `service_history:vehicle:${vehicleId}:${serviceType || 'all'}:${page}:${limit}`;
        const cachedHistory = await redisService.get(cacheKey);
        if (cachedHistory) {
            return res.json({
                success: true,
                message: "Lấy lịch sử dịch vụ thành công",
                data: cachedHistory.serviceHistory,
                pagination: cachedHistory.pagination
            });
        }

        const vehicle = await Vehicle.findById(vehicleId)
            .select('vin serviceHistory')
            .populate('serviceHistory.technicianId', 'username email')
            .lean();

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        let serviceHistory = vehicle.serviceHistory;

        // Filter by service type
        if (serviceType) {
            serviceHistory = serviceHistory.filter(record => record.serviceType === serviceType);
        }

        // Sort by service date (newest first)
        serviceHistory.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

        // Pagination
        const total = serviceHistory.length;
        const skip = (page - 1) * limit;
        const paginatedHistory = serviceHistory.slice(skip, skip + parseInt(limit));

        const result = {
            serviceHistory: paginatedHistory,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        };

        // Cache for 30 minutes
        await redisService.set(cacheKey, result, 1800);

        res.json({
            success: true,
            message: "Lấy lịch sử dịch vụ thành công",
            data: result.serviceHistory,
            pagination: result.pagination,
            vehicleVin: vehicle.vin
        });

    } catch (err) {
        console.error("Get service history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy lịch sử dịch vụ",
            error: err.message
        });
    }
});

// Update service history record
router.put("/:vehicleId/service-history/:recordId", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { vehicleId, recordId } = req.params;
        const updateData = req.body;

        // Remove fields that shouldn't be updated
        delete updateData.technicianId;
        delete updateData.createdAt;

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        const serviceRecord = vehicle.serviceHistory.id(recordId);
        if (!serviceRecord) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi dịch vụ"
            });
        }

        // Check permission - only the technician who created the record or admin/service_staff can update
        if (req.user.role !== 'admin' && req.user.role !== 'service_staff' &&
            serviceRecord.technicianId.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "Không có quyền cập nhật bản ghi này"
            });
        }

        // Update fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                serviceRecord[key] = updateData[key];
            }
        });

        serviceRecord.updatedAt = new Date();
        await vehicle.save();

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`service_history:vehicle:${vehicleId}`);

        console.log(`📝 Service record updated: ${recordId} by ${req.user.email}`);

        res.json({
            success: true,
            message: "Cập nhật lịch sử dịch vụ thành công",
            data: {
                recordId: serviceRecord._id,
                serviceType: serviceRecord.serviceType,
                updatedAt: serviceRecord.updatedAt
            }
        });

    } catch (err) {
        console.error("Update service history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật lịch sử dịch vụ",
            error: err.message
        });
    }
});

// Get service history by service center
router.get("/service-center/:centerName/history", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
    try {
        const { centerName } = req.params;
        const { serviceType, startDate, endDate, page = 1, limit = 50 } = req.query;

        // Check cache first
        const cacheKey = `service_history:center:${centerName}:${serviceType || 'all'}:${startDate || ''}:${endDate || ''}:${page}:${limit}`;
        const cachedHistory = await redisService.get(cacheKey);
        if (cachedHistory) {
            return res.json({
                success: true,
                message: "Lấy lịch sử dịch vụ thành công",
                data: cachedHistory.records,
                pagination: cachedHistory.pagination
            });
        }

        // Build aggregation pipeline
        const pipeline = [
            { $match: { assignedServiceCenter: centerName } },
            { $unwind: '$serviceHistory' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'serviceHistory.technicianId',
                    foreignField: '_id',
                    as: 'serviceHistory.technician'
                }
            },
            {
                $project: {
                    vin: 1,
                    model: 1,
                    year: 1,
                    ownerName: 1,
                    'serviceHistory._id': 1,
                    'serviceHistory.serviceType': 1,
                    'serviceHistory.description': 1,
                    'serviceHistory.serviceDate': 1,
                    'serviceHistory.mileage': 1,
                    'serviceHistory.cost': 1,
                    'serviceHistory.status': 1,
                    'serviceHistory.technician.username': 1,
                    'serviceHistory.technician.email': 1
                }
            }
        ];

        // Add filters
        const matchConditions = {};
        if (serviceType) {
            matchConditions['serviceHistory.serviceType'] = serviceType;
        }
        if (startDate || endDate) {
            matchConditions['serviceHistory.serviceDate'] = {};
            if (startDate) matchConditions['serviceHistory.serviceDate'].$gte = new Date(startDate);
            if (endDate) matchConditions['serviceHistory.serviceDate'].$lte = new Date(endDate);
        }

        if (Object.keys(matchConditions).length > 0) {
            pipeline.push({ $match: matchConditions });
        }

        // Sort by service date (newest first)
        pipeline.push({ $sort: { 'serviceHistory.serviceDate': -1 } });

        // Execute aggregation
        const records = await Vehicle.aggregate(pipeline);

        // Pagination
        const total = records.length;
        const skip = (page - 1) * limit;
        const paginatedRecords = records.slice(skip, skip + parseInt(limit));

        const result = {
            records: paginatedRecords,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        };

        // Cache for 15 minutes
        await redisService.set(cacheKey, result, 900);

        res.json({
            success: true,
            message: "Lấy lịch sử dịch vụ thành công",
            data: result.records,
            pagination: result.pagination
        });

    } catch (err) {
        console.error("Get service center history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy lịch sử dịch vụ",
            error: err.message
        });
    }
});

module.exports = router;
