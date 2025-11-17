import React, { useState } from "react";
import {
  useGetAllCampaignVehiclesQuery,
  useGetAllAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateCampaignVehicleStatusMutation,
} from "../../../features/campaign/campaign.api";
import { useGetAllVehiclesQuery } from "../../../features/vehicle/vehicle.api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Loading from "../../../components/Loading";
import { toast } from "react-toastify";

// Component Title (Giả định bạn có component này)
const Title = ({ title, subTitle }) => (
  <div>
    <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
    <p className="text-sm text-gray-500">{subTitle}</p>
  </div>
);

// Component Modal (Tạo Modal đơn giản cho Appointment)
const AppointmentModal = ({
  isOpen,
  onClose,
  selectedVehicle,
  appointmentDate,
  setAppointmentDate,
  onSubmit,
  isCreatingAppointment,
}) => {
  if (!isOpen || !selectedVehicle) return null;
  const { cv, fullVehicle } = selectedVehicle;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-2xl transition-all transform duration-300">
        <div className="flex justify-between items-start border-b border-gray-300 pb-3 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Đặt lịch hẹn dịch vụ
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600 transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mb-4 text-sm space-y-2">
          <p>
            <span className="font-medium text-gray-700">Chiến dịch:</span>{" "}
            {cv.campaign_id?.title || "Không xác định"}
          </p>
          <p>
            <span className="font-medium text-gray-700">VIN:</span>{" "}
            <span className="font-mono text-blue-600">{cv.vin}</span>
          </p>
          <p>
            <span className="font-medium text-gray-700">Khách hàng:</span>{" "}
            {fullVehicle?.customer_name || "---"}
          </p>
          <p>
            <span className="font-medium text-gray-700">SĐT:</span>{" "}
            {fullVehicle?.customer_phone || "---"}
          </p>
        </div>

        <label className="block text-gray-700 text-sm font-medium mb-2">
          Chọn Ngày & Giờ hẹn:
        </label>
        <input
          type="datetime-local"
          value={appointmentDate}
          className="border border-gray-300 p-2 w-full rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition"
          onChange={(e) => setAppointmentDate(e.target.value)}
          min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
        />

        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            onClick={onClose}
          >
            Hủy bỏ
          </button>

          <button
            className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition ${isCreatingAppointment ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={onSubmit}
            disabled={!appointmentDate || !fullVehicle?.customer_name}
          >
            Xác nhận Đặt lịch
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CampaignManagement() {
  // RTK Query Hooks
  const { data: campaignVehiclesData, isLoading: isLoadingCV } =
    useGetAllCampaignVehiclesQuery();
  const { data: appointmentsData, isLoading: isLoadingAppointments } =
    useGetAllAppointmentsQuery();
  const { data: allVehicleData, isLoading: isLoadingVehicles } =
    useGetAllVehiclesQuery();
  const [createAppointment, { isLoading: isCreatingAppointment }] =
    useCreateAppointmentMutation();
  const [updateCampaignVehicleStatus] =
    useUpdateCampaignVehicleStatusMutation();

  // State
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");

  const campaignVehicles = campaignVehiclesData || [];
  const appointments = appointmentsData || [];
  const allVehicle = allVehicleData || [];

  // --- Xử lý logic ---
  const handleCreateAppointment = async () => {
    if (!selectedVehicle || !appointmentDate) return;

    // Lấy thông tin cần thiết từ selectedVehicle
    const { cv, fullVehicle } = selectedVehicle;

    const customerName = fullVehicle?.customer_name;
    const customerPhone = fullVehicle?.customer_phone;
    const customerEmail = fullVehicle?.customer_email; // Giả định trường email tồn tại trong fullVehicle
    const vin = cv.vin;
    const model = cv.model;

    // Đảm bảo các trường bắt buộc có dữ liệu
    if (!customerName || !customerPhone || !customerEmail) {
      toast.error(
        "Lỗi: Thiếu thông tin Khách hàng (Tên/SĐT/Email) để đặt lịch và gửi thông báo. Vui lòng cập nhật thông tin xe trước."
      );
      return;
    }

    try {
      // Cập nhật payload để truyền các thông tin cần thiết xuống req.body
      await createAppointment({
        campaign_vehicle_id: cv._id,
        start_time: appointmentDate,
        // Thêm các thông tin vehicle/customer để backend sử dụng cho email/logging
        vin: vin,
        model: model,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        // service_center_id và description (nếu có)
        // description: "Đặt lịch từ hệ thống quản lý",
        // service_center_id: "..."
      }).unwrap();

      toast.success(
        `Đã tạo lịch hẹn thành công cho xe ${cv.vin} vào lúc ${format(
          new Date(appointmentDate),
          "dd/MM/yyyy HH:mm",
          {
            locale: vi,
          }
        )}`
      );

      // Đóng modal và reset state
      setOpenModal(false);
      setAppointmentDate("");
      setSelectedVehicle(null);
    } catch (error) {
      console.error("Lỗi khi tạo lịch hẹn:", error);
      toast.error(error.data?.message || "Đã xảy ra lỗi khi tạo lịch hẹn.");
    }
  };

  const statusColors = {
    created: "bg-yellow-100 text-yellow-700",
    notified: "bg-blue-100 text-blue-700",
    handled: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-700",
    in_progress: "bg-orange-100 text-orange-700",
    // Thêm các trạng thái khác nếu có
    default: "bg-yellow-100 text-yellow-700",
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case "created":
        return "Đã tạo";
      case "notified":
        return "Đã thông báo";
      case "handled":
        return "Đã xử lý";
      case "completed":
        return "Hoàn tất";
      case "in_progress":
        return "Đang thực hiện";
      default:
        return status;
    }
  };

  const handleOpenModal = (cv) => {
    const fullVehicle = allVehicle.find((v) => v.vin === cv.vin);
    setSelectedVehicle({ cv, fullVehicle });
    setOpenModal(true);
    setAppointmentDate(""); // Reset ngày hẹn mỗi khi mở
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateCampaignVehicleStatus({
        id,
        status: newStatus,
      }).unwrap();
      toast.success(`Cập nhật trạng thái thành công: ${newStatus}`);
    } catch (error) {
      toast.error(
        error.data?.message || "Đã xảy ra lỗi khi cập nhật trạng thái."
      );
    }
  };

  if (isLoadingCV || isLoadingAppointments || isLoadingVehicles) {
    return (
      <div className="flex-1 p-8 space-y-8 bg-gray-50 min-h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-8 bg-gray-50 min-h-screen">
      <Title
        title="Quản lý Xe trong Chiến dịch Triệu hồi"
        subTitle="Theo dõi xe bị ảnh hưởng và tạo lịch hẹn dịch vụ"
      />

      <hr className="border-gray-200" />

      {/* --- Danh sách xe trong chiến dịch --- */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="p-4 bg-gray-50 border-b border-gray-300">
          <h3 className="text-xl font-semibold text-gray-800">
            Danh sách Xe Bị Ảnh Hưởng
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr className="text-left text-gray-600">
                <th className="p-3">VIN</th>
                <th className="p-3">Model</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3">SĐT</th>
                <th className="p-3 text-center">Tình trạng (Campaign)</th>
                <th className="p-3 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody>
              {campaignVehicles.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    Không tìm thấy xe nào trong các chiến dịch.
                  </td>
                </tr>
              )}
              {campaignVehicles.map((cv) => {
                const fullVehicle = allVehicle.find((v) => v.vin === cv.vin);

                const statusClass =
                  statusColors[cv.status] || statusColors.default;

                return (
                  <tr
                    key={cv._id}
                    className="border-t border-gray-300 hover:bg-gray-50 transition"
                  >
                    <td className="p-3 font-mono text-gray-800">{cv.vin}</td>
                    <td className="p-3">{cv.model}</td>
                    <td className="p-3 font-medium">
                      {fullVehicle?.customer_name || "---"}
                    </td>
                    <td className="p-3 text-gray-600">
                      {fullVehicle?.customer_phone || "---"}
                    </td>
                    <td className="p-3 flex justify-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}
                      >
                        {getStatusDisplay(cv.status)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {cv.status === "notified" ? (
                        <div className="flex  flex-col items-center">
                          <button
                            className="px-2 py-1 bg-orange-100 font-semibold cursor-pointer rounded-lg text-sm  transition disabled:bg-gray-400"
                            onClick={() =>
                              handleUpdateStatus(cv._id, "in_progress")
                            }
                          >
                            <span className="text-orange-600 font-semibold text-xs">
                              Sửa chữa
                            </span>
                          </button>
                        </div>
                      ) : cv.status === "in_progress" ? (
                        <div className="flex  flex-col items-center">
                          <button
                            className="px-2 py-1 bg-green-100 font-semibold cursor-pointer rounded-lg text-sm  transition disabled:bg-gray-400"
                            onClick={() =>
                              handleUpdateStatus(cv._id, "completed")
                            }
                          >
                            <span className="text-green-600 font-semibold text-xs">
                              Hoàn thành
                            </span>
                          </button>
                        </div>
                      ): cv.status === "completed" ? (
                        <div className="flex  flex-col items-center">
                          <span className="text-green-600 font-semibold text-xs">
                            Hoàn thành
                          </span>
                        </div>
                      ): (
                        <button
                          className="px-4 py-2 text-blue-600 font-semibold cursor-pointer rounded-lg text-sm  transition disabled:bg-gray-400"
                          onClick={() => handleOpenModal(cv)}
                          disabled={!fullVehicle || !fullVehicle.customer_name}
                        >
                          Chi tiết
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------- APPOINTMENT MODAL ------------------------- */}
      <AppointmentModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        selectedVehicle={selectedVehicle}
        appointmentDate={appointmentDate}
        setAppointmentDate={setAppointmentDate}
        onSubmit={handleCreateAppointment}
        isCreatingAppointment={isCreatingAppointment}
      />
    </div>
  );
}
