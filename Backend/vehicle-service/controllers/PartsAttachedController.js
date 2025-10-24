import PartsAttached from '../models/PartsAttached.js';
import CreatePartsAttachedDto from '../models/dto/request/CreatePartsAttachedDto.js';
import UpdatePartsAttachedDto from '../models/dto/request/UpdatePartsAttachedDto.js';
import PartsAttachedResponseDto from '../models/dto/response/PartsAttachedResponse.js';

class PartsAttachedController {
    // POST /api/vehicles/:vin/parts - Gắn phụ tùng vào xe
    static async attachPartToVehicle(req, res) {
        try {
            const { vin } = req.params;
            const createDto = new CreatePartsAttachedDto({ ...req.body, vin });
            const validation = createDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const partsAttached = new PartsAttached(createDto.toModel());
            await partsAttached.save();

            const responseDto = new PartsAttachedResponseDto(partsAttached);
            res.status(201).json({
                success: true,
                message: 'Gắn phụ tùng thành công',
                data: responseDto
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi gắn phụ tùng',
                error: error.message
            });
        }
    }

    // GET /api/vehicles/:vin/parts - Lấy danh sách phụ tùng của xe
    static async getVehicleParts(req, res) {
        try {
            const { vin } = req.params;
            const parts = await PartsAttached.find({ vin }).sort({ install_date: -1 });

            const responseData = parts.map(part => new PartsAttachedResponseDto(part));

            res.json({
                success: true,
                data: responseData,
                count: responseData.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy danh sách phụ tùng',
                error: error.message
            });
        }
    }

    // PATCH /api/parts/:serial_number - Cập nhật trạng thái phụ tùng
    static async updatePartStatus(req, res) {
        try {
            const { serial_number } = req.params;
            const updateDto = new UpdatePartsAttachedDto(req.body);
            const validation = updateDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const partsAttached = await PartsAttached.findOneAndUpdate(
                { serial_number },
                updateDto.toModel(),
                { new: true, runValidators: true }
            );

            if (!partsAttached) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy phụ tùng'
                });
            }

            const responseDto = new PartsAttachedResponseDto(partsAttached);
            res.json({
                success: true,
                message: 'Cập nhật phụ tùng thành công',
                data: responseDto
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi cập nhật phụ tùng',
                error: error.message
            });
        }
    }

    // GET /api/parts/:serial_number - Lấy thông tin phụ tùng theo serial
    static async getPartBySerial(req, res) {
        try {
            const { serial_number } = req.params;
            const partsAttached = await PartsAttached.findOne({ serial_number });

            if (!partsAttached) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy phụ tùng'
                });
            }

            const responseDto = new PartsAttachedResponseDto(partsAttached);
            res.json({
                success: true,
                data: responseDto
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin phụ tùng',
                error: error.message
            });
        }
    }
}

export default PartsAttachedController;