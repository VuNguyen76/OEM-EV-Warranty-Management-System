import Vehicle from '../models/Vehicle.js';
import PartsAttached from '../models/PartsAttached.js';
import CreateVehicleDto from '../models/dto/request/CreateVehicleDto.js';
import UpdateVehicleDto from '../models/dto/request/UpdateVehicleDto.js';
import VehicleResponseDto from '../models/dto/response/VehicleResponse.js';
import SearchDto from '../models/dto/request/SearchDto.js';
import WarrantyServiceClient from '../utils/WarrantyServiceClient.js';

class VehicleController {
    static async getAllVehicles(req, res) {
        try {
            const searchDto = new SearchDto(req.query);
            const query = searchDto.getMongoQuery();
            const pagination = searchDto.getPagination();

            const vehicles = await Vehicle.find(query)
                .populate('customer_id', 'full_name phone')
                .sort(pagination.sort)
                .skip(pagination.skip)
                .limit(pagination.limit);

            const responseData = vehicles.map(vehicle => new VehicleResponseDto(vehicle));

            res.json({
                success: true,
                data: responseData,
                count: responseData.length,
                page: searchDto.page,
                limit: searchDto.limit
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy danh sách xe',
                error: error.message
            });
        }
    }

    static async createVehicle(req, res) {
        try {
            const createDto = new CreateVehicleDto(req.body);
            const validation = createDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const vehicle = new Vehicle(createDto.toModel());
            await vehicle.save();

            const responseDto = new VehicleResponseDto(vehicle);
            res.status(201).json({
                success: true,
                message: 'Tạo xe thành công',
                data: responseDto
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi tạo xe',
                error: error.message
            });
        }
    }

    static async getVehicleById(req, res) {
        try {
            const { id } = req.params;
            const vehicle = await Vehicle.findById(id)
                .populate('customer_id', 'full_name phone email');

            if (!vehicle) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }

            const responseDto = new VehicleResponseDto(vehicle);
            res.json({
                success: true,
                data: responseDto
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin xe',
                error: error.message
            });
        }
    }

    static async updateVehicle(req, res) {
        try {
            const { id } = req.params;
            const updateDto = new UpdateVehicleDto(req.body);
            const validation = updateDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const vehicle = await Vehicle.findByIdAndUpdate(
                id,
                updateDto.toModel(),
                { new: true, runValidators: true }
            ).populate('customer_id', 'full_name phone');

            if (!vehicle) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }

            const responseDto = new VehicleResponseDto(vehicle);
            res.json({
                success: true,
                message: 'Cập nhật xe thành công',
                data: responseDto
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi cập nhật xe',
                error: error.message
            });
        }
    }

    static async deleteVehicle(req, res) {
        try {
            const { id } = req.params;
            const vehicle = await Vehicle.findByIdAndDelete(id);

            if (!vehicle) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }

            res.json({
                success: true,
                message: 'Xóa xe thành công'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi xóa xe',
                error: error.message
            });
        }
    }

    static async searchVehicles(req, res) {
        try {
            const searchDto = new SearchDto(req.query);

            if (!searchDto.q) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu từ khóa tìm kiếm'
                });
            }

            const query = searchDto.getMongoQuery();
            const vehicles = await Vehicle.find(query)
                .populate('customer_id', 'full_name phone')
                .sort({ createdAt: -1 });

            const responseData = vehicles.map(vehicle => new VehicleResponseDto(vehicle));

            res.json({
                success: true,
                data: responseData,
                count: responseData.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi tìm kiếm xe',
                error: error.message
            });
        }
    }

    // GET /api/vehicles/:vin/warranty-status - Kiểm tra tình trạng bảo hành
    static async getWarrantyStatus(req, res) {
        try {
            const { vin } = req.params;

            // Lấy thông tin xe
            const vehicle = await Vehicle.findOne({ vin })
                .populate('customer_id', 'full_name phone email');

            if (!vehicle) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }

            // Tính toán warranty status
            const now = new Date();
            const warrantyEnd = new Date(vehicle.warranty_end);
            const daysRemaining = Math.ceil((warrantyEnd - now) / (1000 * 60 * 60 * 24));

            const vehicleWarranty = {
                status: vehicle.warranty_status,
                start_date: vehicle.warranty_start,
                end_date: vehicle.warranty_end,
                days_remaining: daysRemaining > 0 ? daysRemaining : 0,
                is_valid: vehicle.warranty_status === 'valid' && daysRemaining > 0
            };

            // Lấy danh sách parts đã gắn
            const parts = await PartsAttached.find({ vin, status: 'active' })
                .populate('part_id', 'part_name category warranty_duration_months')
                .sort({ install_date: -1 });

            const partsWarranty = parts.map(part => {
                const installDate = new Date(part.install_date);
                const warrantyMonths = part.part_id?.warranty_duration_months || 12;
                const partWarrantyEnd = new Date(installDate);
                partWarrantyEnd.setMonth(partWarrantyEnd.getMonth() + warrantyMonths);

                const partDaysRemaining = Math.ceil((partWarrantyEnd - now) / (1000 * 60 * 60 * 24));

                return {
                    serial_number: part.serial_number,
                    part_name: part.part_id?.part_name || 'Unknown',
                    category: part.part_id?.category || 'other',
                    install_date: part.install_date,
                    warranty_end: partWarrantyEnd,
                    days_remaining: partDaysRemaining > 0 ? partDaysRemaining : 0,
                    is_valid: partDaysRemaining > 0
                };
            });

            // Lấy thông tin claims từ Warranty Service
            const claimsStats = await WarrantyServiceClient.getClaimsStats(vin);

            res.json({
                success: true,
                data: {
                    vehicle: {
                        vin: vehicle.vin,
                        brand: vehicle.brand,
                        model: vehicle.model,
                        manufacture_year: vehicle.manufacture_year,
                        customer: vehicle.customer_id ? {
                            name: vehicle.customer_id.full_name,
                            phone: vehicle.customer_id.phone,
                            email: vehicle.customer_id.email
                        } : null
                    },
                    vehicle_warranty: vehicleWarranty,
                    parts_warranty: {
                        total_parts: partsWarranty.length,
                        valid_parts: partsWarranty.filter(p => p.is_valid).length,
                        expired_parts: partsWarranty.filter(p => !p.is_valid).length,
                        parts: partsWarranty
                    },
                    claims_summary: claimsStats
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin bảo hành',
                error: error.message
            });
        }
    }
}

export default VehicleController;