import CampaignVehicle from "../models/CampaignVehicle.js";

class CampaignVehicleController {
  static async getAllCampaignVehicles(req, res) {
    try {
      const vehicles = await CampaignVehicle.find()
        .populate("campaign_id", "title description")
        .sort({ created_at: -1 });
      res.json({
        success: true,
        data: vehicles,
        count: vehicles.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách xe trong chiến dịch",
        error: error.message,
      });
    }
  }
  static async updateCampaignStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const vehicle = await CampaignVehicle.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!vehicle) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy xe trong chiến dịch" });
      }
      res
        .status(200)
        .json({ success: true, message: "Cập nhật trạng thái thành công", data: vehicle });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi cập nhật trạng thái xe trong chiến dịch",
        error: error.message,
      });
    }
  }
}

export default CampaignVehicleController;
