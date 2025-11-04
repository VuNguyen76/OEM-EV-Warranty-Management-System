import RepairOrder from '../models/RepairOrder.js';
import WarrantyClaim from '../models/WarrantyClaim.js';
import CreateRepairOrderDto from '../models/dto/request/CreateRepairOrderDto.js';
import UpdateRepairOrderDto from '../models/dto/request/UpdateRepairOrderDto.js';
import RepairOrderResponseDto from '../models/dto/response/RepairOrderResponse.js';

class RepairOrderController {
    // POST /api/repair-orders - Tạo repair order (sau khi approve claim)
    static async createRepairOrder(req, res) {
        try {
            const createDto = new CreateRepairOrderDto(req.body);
            const validation = createDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            // Verify claim exists and is approved
            const claim = await WarrantyClaim.findById(createDto.claim_id);
            if (!claim) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy warranty claim'
                });
            }

            if (claim.status !== 'approved') {
                return res.status(400).json({
                    success: false,
                    message: 'Claim chưa được approve, không thể tạo repair order'
                });
            }

            // Check if repair order already exists for this claim
            const existingOrder = await RepairOrder.findOne({ claim_id: createDto.claim_id });
            if (existingOrder) {
                return res.status(400).json({
                    success: false,
                    message: 'Repair order đã tồn tại cho claim này',
                    order_code: existingOrder.order_code
                });
            }

            const repairOrder = new RepairOrder(createDto.toModel());
            await repairOrder.save();

            // Update claim with repair_order_id
            claim.repair_order_id = repairOrder._id;
            await claim.save();

            res.status(201).json({
                success: true,
                order_code: repairOrder.order_code,
                message: 'Tạo repair order thành công'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi tạo repair order',
                error: error.message
            });
        }
    }

    // GET /api/repair-orders/:id - Lấy chi tiết repair order
    static async getRepairOrderById(req, res) {
        try {
            const { id } = req.params;

            const repairOrder = await RepairOrder.findById(id)
                .populate('claim_id', 'claim_code vin service_center_id technician_id actual_cost status parts');
            // Note: parts information is stored in the repair order itself

            if (!repairOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy repair order'
                });
            }

            const responseDto = new RepairOrderResponseDto(repairOrder);
            res.json({
                success: true,
                data: responseDto.toJSON()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy thông tin repair order',
                error: error.message
            });
        }
    }

    // GET /api/repair-orders - Lấy danh sách repair orders
    static async getAllRepairOrders(req, res) {
        try {
            const { status } = req.query;
            const query = {};

            if (status) query.status = status;

            const repairOrders = await RepairOrder.find(query)
                .populate('claim_id', 'claim_code vin service_center_id')
                .sort({ created_at: -1 });

            const responseData = repairOrders.map(order => ({
                order_code: order.order_code,
                claim_code: order.claim_id?.claim_code,
                vin: order.claim_id?.vin,
                status: order.status,
                parts_count: order.parts ? order.parts.length : 0,
                start_date: order.start_date,
                end_date: order.end_date
            }));

            res.json({
                success: true,
                data: responseData,
                count: responseData.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi lấy danh sách repair orders',
                error: error.message
            });
        }
    }

    // PATCH /api/repair-orders/:id - Cập nhật trạng thái repair order
    static async updateRepairOrder(req, res) {
        try {
            const { id } = req.params;
            const updateDto = new UpdateRepairOrderDto(req.body);
            const validation = updateDto.validate();

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: validation.newErrors
                });
            }

            const repairOrder = await RepairOrder.findByIdAndUpdate(
                id,
                updateDto.toModel(),
                { new: true, runValidators: true }
            ).populate('claim_id', 'claim_code vin');

            if (!repairOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy repair order'
                });
            }

            // If completed, update claim status
            if (repairOrder.status === 'completed') {
                await WarrantyClaim.findByIdAndUpdate(
                    repairOrder.claim_id._id,
                    { status: 'completed' }
                );
            }

            res.json({
                success: true,
                message: 'Cập nhật repair order thành công',
                data: {
                    order_code: repairOrder.order_code,
                    status: repairOrder.status,
                    end_date: repairOrder.end_date
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: 'Lỗi cập nhật repair order',
                error: error.message
            });
        }
    }
}

export default RepairOrderController;
