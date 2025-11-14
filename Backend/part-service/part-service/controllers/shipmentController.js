import Shipment from '../models/Shipment.js';
import CreateShipmentDto from '../models/dto/request/CreateShipmentDto.js';
import UpdateShipmentDto from '../models/dto/request/UpdateShipmentDto.js';
import ShipmentResponseDto from '../models/dto/response/ShipmentResponse.js';
import inventoryService from '../services/inventoryService.js';

class ShipmentController {
  // POST /api/shipments - Tạo lệnh giao phụ tùng
  static async createShipment(req, res) {
    try {
      const createDto = new CreateShipmentDto(req.body);
      const validation = createDto.validate();

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: validation.newErrors
        });
      }

      const shipment = new Shipment(createDto.toModel());
      await shipment.save();

      const responseDto = new ShipmentResponseDto(shipment);
      res.status(201).json({
        success: true,
        message: 'Tạo đơn giao hàng thành công',
        data: responseDto
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Lỗi tạo đơn giao hàng',
        error: error.message
      });
    }
  }

  // GET /api/shipments - Danh sách tất cả shipment
  static async getShipments(req, res) {
    try {
      const { status, service_center_id } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (service_center_id) filter.to_location_id = service_center_id;

      const shipments = await Shipment.find(filter).sort({ created_at: -1 });
      const responseData = shipments.map(shipment => new ShipmentResponseDto(shipment));

      res.json({
        success: true,
        data: responseData,
        count: responseData.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi lấy danh sách đơn giao hàng',
        error: error.message
      });
    }
  }

  // GET /api/shipments/:code - Lấy chi tiết shipment
  static async getShipmentByCode(req, res) {
    try {
      const { code } = req.params;
      const shipment = await Shipment.findOne({ shipment_code: code });

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn giao hàng'
        });
      }

      const responseDto = new ShipmentResponseDto(shipment);
      res.json({
        success: true,
        data: responseDto
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi lấy thông tin đơn giao hàng',
        error: error.message
      });
    }
  }

  // PATCH /api/shipments/:code - Cập nhật trạng thái vận chuyển
  static async updateShipmentStatus(req, res) {
    try {
      const { code } = req.params;
      const updateDto = new UpdateShipmentDto(req.body);
      const validation = updateDto.validate();

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: validation.newErrors
        });
      }

      const shipment = await Shipment.findOne({ shipment_code: code });

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn giao hàng'
        });
      }

      // Update inventory when delivered
      if (updateDto.status === 'delivered') {
        await inventoryService.updateInventoryOnDelivery(shipment);
      }

      const updatedShipment = await Shipment.findOneAndUpdate(
        { shipment_code: code },
        updateDto.toModel(),
        { new: true, runValidators: true }
      );

      const responseDto = new ShipmentResponseDto(updatedShipment);
      res.json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
        data: responseDto
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Lỗi cập nhật trạng thái',
        error: error.message
      });
    }
  }
}

export default ShipmentController; 