import React, { useState } from "react";
import { useGetAllPartCatalogsQuery } from "../../../features/part/part.api";
import {
  useGetAllCampaignsQuery,
  useCreateCampaignMutation,
} from "../../../features/campaign/campaign.api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Title from "../../../components/Title";
import Loading from "../../../components/Loading";

const CampaignManagement = () => {
  // Lấy danh sách phụ tùng
  const {
    data: catalogs = [],
    isLoading: isCatalogLoading,
    error: catalogError,
  } = useGetAllPartCatalogsQuery();

  // Lấy danh sách campaign
  const {
    data: campaigns = [],
    isLoading: isCampaignLoading,
    error: campaignError,
  } = useGetAllCampaignsQuery();

  // Mutation tạo campaign
  const [createCampaign, { isLoading: isCreating }] =
    useCreateCampaignMutation();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [affectedParts, setAffectedParts] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [alertMessage, setAlertMessage] = useState({ type: "", message: "" });

  // Toggle checkbox parts
  const handlePartToggle = (partId) => {
    setAffectedParts((prev) =>
      prev.includes(partId)
        ? prev.filter((id) => id !== partId)
        : [...prev, partId]
    );
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAffectedParts([]);
    setStartDate("");
    setEndDate("");
  };

  // Submit form tạo campaign
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertMessage({ type: "", message: "" });

    if (
      !title ||
      !description ||
      !affectedParts.length ||
      !startDate ||
      !endDate
    ) {
      setAlertMessage({
        type: "error",
        message: "Vui lòng điền đầy đủ thông tin bắt buộc.",
      });
      return;
    }

    try {
      await createCampaign({
        title,
        description,
        affected_parts: affectedParts,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
      }).unwrap();

      setAlertMessage({
        type: "success",
        message: "Tạo chiến dịch thành công!",
      });
      setIsModalOpen(false);
      resetForm();
      // Refetch campaigns để cập nhật danh sách
      // Bạn có thể thêm logic refetch ở đây nếu không sử dụng cache invalidation
    } catch (err) {
      setAlertMessage({
        type: "error",
        message:
          "Tạo chiến dịch thất bại: " +
          (err.data?.message || err.message || "Lỗi không xác định."),
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", {
        locale: vi,
      });
    } catch {
      return "Ngày không hợp lệ";
    }
  };

  const statusColors = {
    active: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
  };
  const getStatusBadge = (status) => {
    const statusText = status
      ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
      : "Unknown";
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
    return (
      <span
        className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium border border-current ${colorClass}`}
      >
        {statusText}
      </span>
    );
  };
  // Tạo map từ _id -> name của catalog
  const partMap = catalogs.reduce((acc, part) => {
    acc[part._id] = part.name;
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 flex-1 bg-gray-50 min-h-screen max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b-2 border-green-200 pb-4">
        <Title title="Quản lý Chiến dịch Thu hồi & Bảo hành" />
        <button
          onClick={() => {
            resetForm();
            setAlertMessage({ type: "", message: "" });
            setIsModalOpen(true);
          }}
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition duration-300"
        >
          + Tạo Chiến Dịch Mới
        </button>
      </div>

      {/* Alert */}
      {alertMessage.message && (
        <div
          className={`p-4 mb-6 rounded-xl border-l-4 font-medium ${
            alertMessage.type === "success"
              ? "bg-green-100 text-green-800 border-green-500"
              : "bg-red-100 text-red-800 border-red-500"
          }`}
        >
          {alertMessage.message}
        </div>
      )}

      {/* Danh sách campaign */}
      <div className="bg-white shadow-2xl rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-green-700">Danh sách Chiến Dịch</h2>

        {campaignError && (
          <p className="text-red-600 mb-4 p-4 bg-red-50 border border-red-300 rounded">
            Lỗi khi tải danh sách: {campaignError.message}
          </p>
        )}

        {isCampaignLoading ? (
          <div className="text-center py-10">
            <Loading />
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-center py-10 text-gray-500 text-lg italic">
            Chưa có chiến dịch nào được tạo.
          </p>
        ) : (
          <div className="space-y-6">
            {campaigns.map((c) => (
              <div
                key={c.campaign_code}
                className="border border-green-200 p-5 rounded-lg shadow-md hover:shadow-lg transition duration-300 bg-white"
              >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800">
                      {c.title}
                    </h3>
                    {getStatusBadge(c.status)}
                </div>
                
                <p className="text-gray-600 mb-4 border-b border-gray-100 pb-3 text-sm">{c.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div className="p-2 border-l-2 border-green-500">
                    <strong className="block text-gray-500">Mã Chiến dịch:</strong> <span className="font-mono text-green-600 font-semibold">{c.campaign_code}</span>
                  </div>
                  <div className="p-2 border-l-2 border-blue-500">
                    <strong className="block text-gray-500">Ngày Bắt Đầu:</strong> {formatDate(c.start_date)}
                  </div>
                  <div className="p-2 border-l-2 border-red-500">
                    <strong className="block text-gray-500">Ngày Kết Thúc:</strong> {formatDate(c.end_date)}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                    <strong className="block mb-2 text-gray-700">
                      Tiến độ hoàn thành:
                    </strong>
                    <div className="flex items-center space-x-3">
                        <span className="text-xl font-bold text-green-600">
                            {c.completed_vehicles}/{c.total_vehicles}
                        </span>
                        <span className="text-gray-500">đã hoàn thành</span>
                        {/* Thanh tiến trình */}
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                            <div 
                                className="h-2 bg-green-500 rounded-full" 
                                style={{ width: `${(c.completed_vehicles / c.total_vehicles) * 100 || 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4">
                  <strong className="block mb-2 text-gray-700">
                    Phụ tùng/Linh kiện bị ảnh hưởng:
                  </strong>
                  <div className="flex flex-wrap gap-2">
                    {c.affected_parts.map((p) => (
                      <span 
                        key={p} 
                        className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-full border border-green-300 font-medium"
                      >
                        {partMap[p] || p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal tạo chiến dịch */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative transform transition-all duration-300">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl transition duration-150"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-6 text-green-700 border-b pb-2">
              Tạo Chiến Dịch Thu Hồi Mới
            </h2>
            <form className="space-y-5" onSubmit={handleSubmit}>
              
              {/* Tiêu đề */}
              <div>
                <label className="block mb-1 font-semibold text-gray-700">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-green-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition"
                  required
                />
              </div>
              
              {/* Mô tả */}
              <div>
                <label className="block mb-1 font-semibold text-gray-700">
                  Mô tả <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-green-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition min-h-[120px]"
                  required
                />
              </div>
              
              {/* Phụ tùng bị ảnh hưởng */}
              <div>
                <label className="block mb-2 font-semibold text-gray-700">
                  Phụ tùng/Linh kiện bị ảnh hưởng{" "}
                  <span className="text-red-500">*</span>
                </label>
                {isCatalogLoading ? (
                  <p className="text-gray-500">Đang tải danh mục phụ tùng...</p>
                ) : catalogError ? (
                  <p className="text-red-500">Lỗi tải danh mục: {catalogError.message}</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto border-2 border-green-200 p-4 rounded-lg bg-green-50 space-y-2 shadow-inner">
                    {catalogs.map((part) => (
                      <label
                        key={part._id}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-green-100 p-1 rounded transition"
                      >
                        <input
                          type="checkbox"
                          checked={affectedParts.includes(part._id)}
                          onChange={() => handlePartToggle(part._id)}
                          className="h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                        />
                        <span className="text-gray-800 font-medium">{part.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Ngày bắt đầu & Kết thúc */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1 font-semibold text-gray-700">
                    Ngày Bắt Đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-green-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition bg-white"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1 font-semibold text-gray-700">
                    Ngày Kết Thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-green-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition bg-white"
                    required
                  />
                </div>
              </div>
              
              {/* Nút Submit/Cancel */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-100 transition duration-150 font-medium"
                >
                    Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isCreating ? "Đang tạo..." : "Tạo Chiến Dịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManagement;