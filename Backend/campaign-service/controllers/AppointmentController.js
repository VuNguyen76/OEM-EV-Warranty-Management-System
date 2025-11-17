import ServiceAppointment from "../models/Appointment.js";
import CampaignVehicle from "../models/CampaignVehicle.js";
import sendEmail from "../utils/sendEmail.js";

class AppointmentController {
  static async getAllAppointments(req, res) {
    try {
      const appointments = await ServiceAppointment.find().populate(
        "campaign_vehicle_id",
        "vin_id customer_id service_center_id"
      );
      res.json({
        success: true,
        data: appointments,
        count: appointments.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách lịch hẹn",
        error: error.message,
      });
    }
  }
  // Đảm bảo bạn đã import các Model cần thiết
  // import ServiceAppointment from '../models/ServiceAppointment'; // Appointment model
  // import CampaignVehicle from '../models/CampaignVehicle'; // Vehicle model

  static async createAppointment(req, res) {
    try {
      // Nhận tất cả các trường, bao gồm các trường bổ sung từ frontend
      const {
        campaign_vehicle_id,
        service_center_id,
        start_time,
        description,
        // Các trường bổ sung từ frontend
        vin,
        customer_name,
        customer_email, // Trường quan trọng cho việc gửi email
      } = req.body;

      // 1. Kiểm tra các trường bắt buộc
      if (!campaign_vehicle_id || !start_time || !customer_email) {
        return res.status(400).json({
          success: false,
          message:
            "Thiếu trường bắt buộc: campaign_vehicle_id, start_time và customer_email.",
        });
      }

      const startTime = new Date(start_time);
      const assumedDurationMs = 1.5 * 60 * 60 * 1000;
      const endTime = new Date(startTime.getTime() + assumedDurationMs);

      // --- BƯỚC GỬI EMAIL XÁC NHẬN LỊCH HẸN ---

      // 2. Tìm thông tin Campaign để có tiêu đề/nội dung
      const cvDetail = await CampaignVehicle.findById(
        campaign_vehicle_id
      ).populate("campaign_id");
      const campaignTitle = cvDetail?.campaign_id?.title || "Dịch vụ/Triệu hồi";

      const emailSubject = `Xác nhận Lịch hẹn Dịch vụ: ${campaignTitle}`;
      const appointmentTime = new Date(startTime).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const emailHtml = `
            <h3>Kính gửi ${customer_name || "Quý khách"},</h3>
            <p>Chúng tôi xác nhận bạn đã đặt lịch hẹn thành công cho xe có số VIN ${
              vin || "---"
            }
            thuộc chiến dịch **${campaignTitle}**.</p>
            <p>Chi tiết lịch hẹn:</p>
            <ul>
                <li><strong>Thời gian:</strong> ${appointmentTime}</li>
                <li><strong>Dịch vụ:</strong> ${campaignTitle}</li>
                <li><strong>Nội dung:</strong> ${
                  description || "Kiểm tra và xử lý theo chiến dịch."
                }</li>
                <li><strong>Địa điểm:</strong> ${
                  service_center_id || "Đang cập nhật"
                }</li>
            </ul>
            <p>Vui lòng đến đúng giờ.</p>
        `;

      try {
        console.log(customer_email);

        await sendEmail({
          to: customer_email,
          subject: emailSubject,
          html: emailHtml,
        });
      } catch (emailError) {
        // Cảnh báo nhưng vẫn tiếp tục tạo lịch hẹn nếu email thất bại
        console.error("Lỗi khi gửi email xác nhận:", emailError);
        // Bạn có thể chọn trả về lỗi hoặc chỉ cảnh báo và tiếp tục
        // Ở đây, tôi chọn cảnh báo và tiếp tục tạo record trong DB
      }

      // 3. Tạo lịch hẹn mới (Tạo Record trong DB sau khi gửi mail)
      const appointmentData = {
        campaign_vehicle_id,
        service_center_id,
        start_time: startTime,
        end_time: endTime,
        description,
      };

      const appointment = await ServiceAppointment.create(appointmentData);

      // 4. Cập nhật trạng thái của CampaignVehicle
      const updatedVehicle = await CampaignVehicle.findByIdAndUpdate(
        campaign_vehicle_id,
        {
          status: "notified",
          notified_at: startTime,
        },
        { new: true }
      );

      if (!updatedVehicle) {
        console.warn(
          `Không tìm thấy CampaignVehicle với ID: ${campaign_vehicle_id} để cập nhật trạng thái.`
        );
      }

      // 5. Trả về kết quả
      res.status(201).json({
        success: true,
        message: "Tạo lịch hẹn thành công và đã gửi email xác nhận.",
        data: {
          appointment,
          campaignVehicle: updatedVehicle,
        },
      });
    } catch (error) {
      console.error("Lỗi Controller tạo lịch hẹn:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi tạo lịch hẹn",
        error: error.message,
      });
    }
  }
}

export default AppointmentController;
