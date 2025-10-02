const express = require("express");
const Vehicle = require("../Model/Vehicle");
const { authenticateToken, authorizeRole } = require("../../shared/middleware/AuthMiddleware");
const redisService = require("../../shared/services/RedisService");

const router = express.Router();

// UC1: Đăng ký xe theo VIN (Nhân viên trung tâm dịch vụ)
router.post("/register", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
    try {
        const {
            vin, model, year, color, batteryCapacity, range,
            ownerName, ownerPhone, ownerEmail, ownerAddress,
            purchaseDate, dealerName, warrantyEndDate,
            assignedServiceCenter, specifications, notes
        } = req.body;

        // Validate required fields
        if (!vin || !model || !year || !ownerName || !ownerPhone || !purchaseDate || !warrantyEndDate) {
            return res.status(400).json({
                success: false,
                message: "VIN, model, năm sản xuất, tên chủ xe, số điện thoại, ngày mua và ngày hết hạn bảo hành là bắt buộc"
            });
        }

        // Check if VIN already exists
        const existingVehicle = await Vehicle.findByVIN(vin);
        if (existingVehicle) {
            return res.status(400).json({
                success: false,
                message: "VIN đã tồn tại trong hệ thống"
            });
        }

        // Create new vehicle
        const newVehicle = new Vehicle({
            vin: vin.toUpperCase(),
            model,
            year,
            color,
            batteryCapacity,
            range,
            ownerName,
            ownerPhone,
            ownerEmail: ownerEmail?.toLowerCase(),
            ownerAddress,
            purchaseDate: new Date(purchaseDate),
            dealerName,
            warrantyStartDate: new Date(purchaseDate),
            warrantyEndDate: new Date(warrantyEndDate),
            assignedServiceCenter,
            specifications,
            notes,
            status: 'active'
        });

        await newVehicle.save();

        // Invalidate cache
        await redisService.del(`vehicles:service_center:${assignedServiceCenter}`);

        console.log(`🚗 Vehicle registered: ${vin} by ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: "Đăng ký xe thành công",
            data: {
                id: newVehicle._id,
                vin: newVehicle.vin,
                model: newVehicle.model,
                year: newVehicle.year,
                ownerName: newVehicle.ownerName,
                isUnderWarranty: newVehicle.isUnderWarranty
            }
        });

    } catch (err) {
        console.error("Vehicle registration error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi đăng ký xe",
            error: err.message
        });
    }
});

// Get vehicle by VIN
router.get("/vin/:vin", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { vin } = req.params;

        // Check cache first
        const cachedVehicle = await redisService.get(`vehicle:${vin.toUpperCase()}`);
        if (cachedVehicle) {
            return res.json({
                success: true,
                message: "Lấy thông tin xe thành công",
                data: cachedVehicle
            });
        }

        const vehicle = await Vehicle.findByVIN(vin)
            .lean();

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe với VIN này"
            });
        }

        // Cache for 1 hour
        await redisService.set(`vehicle:${vin.toUpperCase()}`, vehicle, 3600);

        res.json({
            success: true,
            message: "Lấy thông tin xe thành công",
            data: vehicle
        });

    } catch (err) {
        console.error("Get vehicle by VIN error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin xe",
            error: err.message
        });
    }
});

// Get vehicles by service center
router.get("/service-center/:centerName", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { centerName } = req.params;
        const { status, page = 1, limit = 20 } = req.query;

        // Check cache first
        const cacheKey = `vehicles:service_center:${centerName}:${status || 'all'}:${page}:${limit}`;
        const cachedVehicles = await redisService.get(cacheKey);
        if (cachedVehicles) {
            return res.json({
                success: true,
                message: "Lấy danh sách xe thành công",
                data: cachedVehicles.vehicles,
                pagination: cachedVehicles.pagination
            });
        }

        const query = { assignedServiceCenter: centerName };
        if (status) query.status = status;

        const skip = (page - 1) * limit;
        const vehicles = await Vehicle.find(query)
            .select('vin model year ownerName ownerPhone status currentMileage isUnderWarranty')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 })
            .lean();

        const total = await Vehicle.countDocuments(query);

        const result = {
            vehicles,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        };

        // Cache for 10 minutes
        await redisService.set(cacheKey, result, 600);

        res.json({
            success: true,
            message: "Lấy danh sách xe thành công",
            data: result.vehicles,
            pagination: result.pagination
        });

    } catch (err) {
        console.error("Get vehicles by service center error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách xe",
            error: err.message
        });
    }
});

// Search vehicles
router.get("/search", authenticateToken, authorizeRole("admin", "service_staff", "technician"), async (req, res) => {
    try {
        const { q, type = 'vin', page = 1, limit = 20 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: "Từ khóa tìm kiếm là bắt buộc"
            });
        }

        let query = {};
        switch (type) {
            case 'vin':
                query.vin = { $regex: q.toUpperCase(), $options: 'i' };
                break;
            case 'owner':
                query.$or = [
                    { ownerName: { $regex: q, $options: 'i' } },
                    { ownerPhone: { $regex: q, $options: 'i' } },
                    { ownerEmail: { $regex: q, $options: 'i' } }
                ];
                break;
            case 'model':
                query.model = { $regex: q, $options: 'i' };
                break;
            default:
                query.$or = [
                    { vin: { $regex: q.toUpperCase(), $options: 'i' } },
                    { ownerName: { $regex: q, $options: 'i' } },
                    { ownerPhone: { $regex: q, $options: 'i' } },
                    { model: { $regex: q, $options: 'i' } }
                ];
        }

        const skip = (page - 1) * limit;
        const vehicles = await Vehicle.find(query)
            .select('vin model year ownerName ownerPhone status assignedServiceCenter')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 })
            .lean();

        const total = await Vehicle.countDocuments(query);

        res.json({
            success: true,
            message: "Tìm kiếm xe thành công",
            data: vehicles,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (err) {
        console.error("Search vehicles error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi tìm kiếm xe",
            error: err.message
        });
    }
});

// Update vehicle information
router.put("/:id", authenticateToken, authorizeRole("admin", "service_staff"), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove fields that shouldn't be updated directly
        delete updateData.vin;
        delete updateData.parts;
        delete updateData.serviceHistory;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        const vehicle = await Vehicle.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).lean();

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy xe"
            });
        }

        // Invalidate cache
        await redisService.del(`vehicle:${vehicle.vin}`);
        if (vehicle.assignedServiceCenter) {
            await redisService.del(`vehicles:service_center:${vehicle.assignedServiceCenter}`);
        }

        console.log(`🔧 Vehicle updated: ${vehicle.vin} by ${req.user.email}`);

        res.json({
            success: true,
            message: "Cập nhật thông tin xe thành công",
            data: vehicle
        });

    } catch (err) {
        console.error("Update vehicle error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật xe",
            error: err.message
        });
    }
});

module.exports = router;
