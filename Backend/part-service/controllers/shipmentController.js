import Shipment from '../models/Shipment.js';
import inventoryService from '../services/inventoryService.js';

class ShipmentController {
  // Tạo lệnh giao phụ tùng
  // [POST] /api/shipments
  async createShipment(req, res) {
    try {
      const { claim_id, to_service_center_id, parts_list, from_location_id = 'EVM_HCM' } = req.body;

      if (!claim_id) {
        res.status(400).json({
          success: false,
          message: 'Mã bảo hành không hợp lệ'
        });
      }
      if (!parts_list) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập phụ tùng '
        });
      }
      // Tạo mã shipment tự động
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const shipment_code = `SHIP${timestamp}${random}`;

      const shipment = new Shipment({
        shipment_code,
        claim_id,
        from_location_id,
        to_location_id: to_service_center_id,
        parts_list,
        status: 'pending'
      });

      await shipment.save();

      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng thành công',
        shipment_code: shipment_code
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Danh sách tất cả shipment
  async getShipments(req, res) {
    try {
      const { status, service_center_id } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (service_center_id) filter.to_location_id = service_center_id;

      const shipments = await Shipment.find(filter)
        .sort({ created_at: -1 });

      res.json({
        data: shipments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lấy chi tiết shipment
  async getShipmentByCode(req, res) {
    try {
      const shipment = await Shipment.findOne({ shipment_code: req.params.code });

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }

      res.json({
        shipment: shipment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }



  // Cập nhật trạng thái vận chuyển
  async updateShipmentStatus(req, res) {
    try {

      const status = req.body.status;
      const delivery_date = req.body.delivery_date;

      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'Vui lòng cập nhật trạng thái'
        });
      }

      const ship = await Shipment.findOne({ shipment_code: req.params.code });

      if (!ship) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }

      if (status == 'delivered') {
        await inventoryService.updateInventoryOnDelivery(ship);
      }

      await Shipment.updateOne(
        { shipment_code: req.params.code },
        {
          status: status,
          updated_at: delivery_date
        }
      );

      res.json({
        success: true,
        message: " Cập nhật trạng thái thành công"
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }


}

export default new ShipmentController(); 