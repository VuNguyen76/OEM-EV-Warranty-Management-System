import PartsAttached from '../models/PartsAttached.js';
import CreatePartsAttachedDto from '../models/dto/request/CreatePartsAttachedDto.js';
import UpdatePartsAttachedDto from '../models/dto/request/UpdatePartsAttachedDto.js';
import PartsAttachedResponseDto from '../models/dto/response/PartsAttachedResponse.js';
import PartServiceClient from '../utils/PartServiceClient.js';

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

            // Validate part_id với Part Service
            const partValidation = await PartServiceClient.validatePartId(createDto.part_id);
            if (!partValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã phụ tùng không tồn tại trong hệ thống',
                    errors: 'part_id không hợp lệ'
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
            const partsAttached = await PartsAttached.find({ vin }).sort({ install_date: -1 });

            // Lấy thông tin chi tiết từ Part Service
            const responseData = await Promise.all(
                partsAttached.map(async (attached) => {
                    const partInfo = await PartServiceClient.getPartById(attached.part_id);
                    const dto = new PartsAttachedResponseDto(attached);

                    // Enrich với thông tin từ Part Service
                    if (partInfo) {
                        dto.part = {
                            part_id: partInfo.part_id,
                            part_name: partInfo.name,
                            category: partInfo.category,
                            manufacturer: partInfo.manufacturer,
                            cost_price: partInfo.cost_price
                        };
                    }

                    return dto;
                })
            );

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

            // Lấy thông tin chi tiết từ Part Service
            const partInfo = await PartServiceClient.getPartById(partsAttached.part_id);

            const responseDto = new PartsAttachedResponseDto(partsAttached);

            // Enrich với thông tin từ Part Service
            if (partInfo) {
                responseDto.part = {
                    part_id: partInfo.part_id,
                    part_name: partInfo.name,
                    category: partInfo.category,
                    manufacturer: partInfo.manufacturer,
                    model_number: partInfo.model_number,
                    specifications: partInfo.specifications,
                    cost_price: partInfo.cost_price
                };
            }

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