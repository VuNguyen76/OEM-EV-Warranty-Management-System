import ServiceRecord from '../models/ServiceRecord.js';
import CreateServiceRecordDto from '../models/dto/request/CreateServiceRecordDto.js';
import UpdateServiceRecordDto from '../models/dto/request/UpdateServiceRecordDto.js';
import ServiceRecordResponseDto from '../models/dto/response/ServiceRecordResponse.js';

class ServiceRecordController {
    // POST /api/vehicles/:vin/service-records - Tạo lịch sử bảo dưỡng
    static async createServiceRecord(req, res) {
        try {
            const { vin } = req.params;
            const createDto = new CreateServiceRecordDto({ ...req.body, vin });
            const validation = createDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const serviceRecord = new ServiceRecord(createDto.toModel());
            await serviceRecord.save();

            const responseDto = new ServiceRecordResponseDto(serviceRecord);
            res.status(201).json({
                success: true,
                message: 'Tạo lịch sử bảo dưỡng thành công',
                data: responseDto
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi tạo lịch sử bảo dưỡng',
                error: error.message
            });
        }
    }

    // GET /api/vehicles/:vin/service-records - Lấy lịch sử bảo dưỡng của xe
    static async getVehicleServiceRecords(req, res) {
        try {
            const { vin } = req.params;
            const records = await ServiceRecord.find({ vin }).sort({ date_in: -1 });

            const responseData = records.map(record => new ServiceRecordResponseDto(record));

            res.json({
                success: true,
                data: responseData,
                count: responseData.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy lịch sử bảo dưỡng',
                error: error.message
            });
        }
    }

    // PATCH /api/service-records/:id - Cập nhật lịch sử bảo dưỡng
    static async updateServiceRecord(req, res) {
        try {
            const { id } = req.params;
            const updateDto = new UpdateServiceRecordDto(req.body);
            const validation = updateDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const serviceRecord = await ServiceRecord.findByIdAndUpdate(
                id,
                updateDto.toModel(),
                { new: true, runValidators: true }
            );

            if (!serviceRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy lịch sử bảo dưỡng'
                });
            }

            const responseDto = new ServiceRecordResponseDto(serviceRecord);
            res.json({
                success: true,
                message: 'Cập nhật lịch sử bảo dưỡng thành công',
                data: responseDto
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi cập nhật lịch sử bảo dưỡng',
                error: error.message
            });
        }
    }

    // GET /api/service-records/:id - Lấy chi tiết lịch sử bảo dưỡng
    static async getServiceRecordById(req, res) {
        try {
            const { id } = req.params;
            const serviceRecord = await ServiceRecord.findById(id);

            if (!serviceRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy lịch sử bảo dưỡng'
                });
            }

            const responseDto = new ServiceRecordResponseDto(serviceRecord);
            res.json({
                success: true,
                data: responseDto
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin lịch sử bảo dưỡng',
                error: error.message
            });
        }
    }
}

export default ServiceRecordController;