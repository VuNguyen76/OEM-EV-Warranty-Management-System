import axios from "axios";
import CampaignVehicle from "../models/CampaignVehicle.js";
import CampaignModel from "../models/campaign.js";

class CampaignController {
  static async createCampaign(req, res) {
    try {
      const {
        title,
        description,
        affected_parts = [],
        start_date,
        end_date,
        notes,
      } = req.body;

      if (!affected_parts.length) {
        return res.status(400).json({
          success: false,
          message: "Phải có affected_parts",
        });
      }

      // -------------------------------------
      // 1. TẠO CAMPAIGN
      // -------------------------------------
      const campaign = await CampaignModel.create({
        title,
        description,
        affected_parts,
        start_date,
        end_date,
        notes,
        status: "active",
        total_vehicles: 0,
        completed_vehicles: 0,
      });

      // -------------------------------------
      // 2. GỌI VEHICLE SERVICE ĐỂ TÌM XE ẢNH HƯỞNG
      // -------------------------------------

      const { data } = await axios.get(
        `${process.env.VEHICLE_SERVICE_URL}/api/vehicles`,
        {
          headers: {
            Authorization: `Bearer ${req.token}`,
          },
        }
      );

      const vehicles = data.data;

      const affectedVehicles = vehicles.filter((v) =>
        v.parts.some((p) => affected_parts.includes(p.part_catalog_id))
      );
      console.log(affectedVehicles);

      // -------------------------------------
      // 3. GHI VÀO campaign_vehicles
      // -------------------------------------
      const campaignVehicleDocs = affectedVehicles.map((v) => ({
        campaign_id: campaign._id,
        vin: v.vin,
        model: v.model,
        affected_parts: v.parts
          .filter((p) => affected_parts.includes(p.part_catalog_id))
          .map((p) => p.part_catalog_id),
        customer_id: v.customer_id,
        service_center_id: v.service_center_id,
        status: "created",
      }));

      await CampaignVehicle.insertMany(campaignVehicleDocs);

      // cập nhật total_vehicles
      campaign.total_vehicles = affectedVehicles.length;
      await campaign.save();

      return res.status(201).json({
        success: true,
        message: "Tạo campaign thành công",
        data: {
          campaign,
          affected_count: affectedVehicles.length,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Lỗi server",
        error: err.message,
      });
    }
  }
  static async getAllCampaigns(req, res) {
    try {
      const campaigns = await CampaignModel.find().sort({ created_at: -1 });
      res.json({
        success: true,
        data: campaigns,
        count: campaigns.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách chiến dịch",
        error: error.message,
      });
    }
  }
  
}

export default CampaignController;
