import Vehicle from '../models/Vehicle.js';
import CreateVehicleDto from '../models/dto/request/CreateVehicleDto.js';
import UpdateVehicleDto from '../models/dto/request/UpdateVehicleDto.js';
import VehicleResponseDto from '../models/dto/response/VehicleResponse.js';
import SearchDto from '../models/dto/request/SearchDto.js';

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
}

export default VehicleController;