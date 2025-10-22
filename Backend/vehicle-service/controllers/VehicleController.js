import Vehicle from '../models/Vehicle.js';

class VehicleController {
    static async getAllVehicles(req, res) {
        try {
            const vehicles = await Vehicle.find().sort({ createdAt: -1 });
            res.json({
                success: true,
                data: vehicles,
                count: vehicles.length
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
            const vehicle = new Vehicle(req.body);
            await vehicle.save();
            res.status(201).json({
                success: true,
                message: 'Tạo xe thành công',
                data: vehicle
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
            const vehicle = await Vehicle.findById(id);

            if (!vehicle) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }

            res.json({
                success: true,
                data: vehicle
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
            const vehicle = await Vehicle.findByIdAndUpdate(
                id,
                req.body,
                { new: true, runValidators: true }
            );

            if (!vehicle) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy xe'
                });
            }

            res.json({
                success: true,
                message: 'Cập nhật xe thành công',
                data: vehicle
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
}

export default VehicleController;