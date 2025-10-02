const createVehicleModel = require("../Model/Vehicle");
const redisService = require("../../shared/services/RedisService");

// Initialize Vehicle model after connection is established
let Vehicle;

// Initialize Vehicle model
function initializeVehicleModel() {
    if (!Vehicle) {
        Vehicle = createVehicleModel();
        console.log("✅ Vehicle model initialized in ServiceHistoryController");
    }
}

// UC3: Add service history to vehicle
const addServiceHistory = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const {
            serviceType, description, serviceDate, mileage,
            serviceCenter, cost, partsReplaced, technician, notes
        } = req.body;

        // Validation
        if (!serviceType || !description || !serviceDate) {
            return res.status(400).json({
                success: false,
                message: "Loại dịch vụ, mô tả và ngày dịch vụ là bắt buộc"
            });
        }

        const newServiceRecord = {
            serviceType,
            description,
            serviceDate: new Date(serviceDate),
            mileage: mileage || 0,
            serviceCenter: serviceCenter || "Không xác định",
            cost: cost || 0,
            partsReplaced: partsReplaced || [],
            technician: technician || "",
            notes: notes || "",
            status: "completed",
            addedBy: req.user.userId
        };

        const vehicle = await Vehicle.findByIdAndUpdate(
            vehicleId,
            { 
                $push: { serviceHistory: newServiceRecord },
                $set: { 
                    currentMileage: mileage || 0,
                    updatedAt: new Date() 
                }
            },
            { new: true }
        ).select("vin model serviceHistory");

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`vehicle:${vehicleId}:service-history`);

        console.log(`🔧 Service history added to vehicle ${vehicle.vin} by ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: "Lưu lịch sử dịch vụ thành công",
            data: {
                vehicleVin: vehicle.vin,
                serviceType,
                serviceDate: new Date(serviceDate),
                mileage: mileage || 0
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
};

// Get vehicle service history with Redis cache
const getServiceHistory = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { serviceType, page = 1, limit = 10 } = req.query;

        const cacheKey = `vehicle:${vehicleId}:service-history:${serviceType || 'all'}:page:${page}:limit:${limit}`;

        // Check Redis cache first
        const cachedHistory = await redisService.get(cacheKey);
        if (cachedHistory) {
            return res.json({
                success: true,
                message: "Lấy lịch sử dịch vụ thành công (cached)",
                data: JSON.parse(cachedHistory),
                cached: true
            });
        }

        const vehicle = await Vehicle.findById(vehicleId)
            .select("vin model serviceHistory")
            .lean();

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        let serviceHistory = vehicle.serviceHistory;

        // Filter by serviceType if provided
        if (serviceType) {
            serviceHistory = serviceHistory.filter(record => record.serviceType === serviceType);
        }

        // Sort by service date (newest first)
        serviceHistory.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

        // Pagination
        const skip = (page - 1) * limit;
        const paginatedHistory = serviceHistory.slice(skip, skip + parseInt(limit));

        const result = {
            vehicleVin: vehicle.vin,
            vehicleModel: vehicle.model,
            serviceHistory: paginatedHistory,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: serviceHistory.length,
                pages: Math.ceil(serviceHistory.length / limit)
            }
        };

        // Cache for 30 minutes
        await redisService.set(cacheKey, JSON.stringify(result), 1800);

        res.json({
            success: true,
            message: "Lấy lịch sử dịch vụ thành công",
            data: result,
            cached: false
        });
    } catch (err) {
        console.error("Get service history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy lịch sử dịch vụ",
            error: err.message
        });
    }
};

// Update service history record
const updateServiceHistory = async (req, res) => {
    try {
        const { vehicleId, recordId } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates._id;
        delete updates.addedBy;

        const updateFields = {};
        Object.keys(updates).forEach(key => {
            updateFields[`serviceHistory.$.${key}`] = updates[key];
        });
        updateFields["serviceHistory.$.updatedAt"] = new Date();
        updateFields["updatedAt"] = new Date();

        const vehicle = await Vehicle.findOneAndUpdate(
            { 
                _id: vehicleId,
                "serviceHistory._id": recordId
            },
            { $set: updateFields },
            { new: true }
        ).select("vin serviceHistory");

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe hoặc bản ghi dịch vụ"
            });
        }

        const updatedRecord = vehicle.serviceHistory.id(recordId);

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        await redisService.del(`vehicle:${vehicleId}:service-history`);

        console.log(`🔧 Service history updated: ${recordId} by ${req.user.email}`);

        res.json({
            success: true,
            message: "Cập nhật lịch sử dịch vụ thành công",
            data: {
                vehicleVin: vehicle.vin,
                recordId: updatedRecord._id,
                serviceType: updatedRecord.serviceType,
                serviceDate: updatedRecord.serviceDate
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
};

// Get service center history
const getServiceCenterHistory = async (req, res) => {
    try {
        const { centerName } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const cacheKey = `service-center:${centerName}:history:page:${page}:limit:${limit}`;

        // Check Redis cache first
        const cachedHistory = await redisService.get(cacheKey);
        if (cachedHistory) {
            return res.json({
                success: true,
                message: "Lấy lịch sử trung tâm dịch vụ thành công (cached)",
                data: JSON.parse(cachedHistory),
                cached: true
            });
        }

        const vehicles = await Vehicle.find({
            "serviceHistory.serviceCenter": centerName
        })
        .select("vin model serviceHistory")
        .lean();

        let allServiceRecords = [];

        vehicles.forEach(vehicle => {
            const centerRecords = vehicle.serviceHistory
                .filter(record => record.serviceCenter === centerName)
                .map(record => ({
                    ...record,
                    vehicleVin: vehicle.vin,
                    vehicleModel: vehicle.model
                }));
            allServiceRecords = allServiceRecords.concat(centerRecords);
        });

        // Sort by service date (newest first)
        allServiceRecords.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

        // Pagination
        const skip = (page - 1) * limit;
        const paginatedRecords = allServiceRecords.slice(skip, skip + parseInt(limit));

        const result = {
            serviceCenter: centerName,
            serviceHistory: paginatedRecords,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: allServiceRecords.length,
                pages: Math.ceil(allServiceRecords.length / limit)
            }
        };

        // Cache for 30 minutes
        await redisService.set(cacheKey, JSON.stringify(result), 1800);

        res.json({
            success: true,
            message: "Lấy lịch sử trung tâm dịch vụ thành công",
            data: result,
            cached: false
        });
    } catch (err) {
        console.error("Get service center history error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy lịch sử trung tâm dịch vụ",
            error: err.message
        });
    }
};

module.exports = {
    initializeVehicleModel,
    addServiceHistory,
    getServiceHistory,
    updateServiceHistory,
    getServiceCenterHistory
};
