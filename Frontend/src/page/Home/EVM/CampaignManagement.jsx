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
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", {
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
        className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${colorClass}`}
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
    <div className="p-4 flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Title title="Quản lý Chiến dịch thu hồi" />
        <button
          onClick={() => {
            resetForm();
            setAlertMessage({ type: "", message: "" });
            setIsModalOpen(true);
          }}
          className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 flex items-center"
        >
          <span className="mr-2 font-bold">+</span> Tạo Chiến Dịch Mới
        </button>
      </div>

      {/* Alert */}
      {alertMessage.message && (
        <div
          className={`p-3 mb-4 rounded-lg ${
            alertMessage.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {alertMessage.message}
        </div>
      )}

      {/* Danh sách campaign */}
      <div className="bg-white shadow-xl rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Danh sách Chiến Dịch</h2>

        {campaignError && (
          <p className="text-red-500 mb-4">
            Lỗi khi tải danh sách: {campaignError.message}
          </p>
        )}

        {isCampaignLoading ? (
          <div className="text-center py-10">
            <Loading />
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-center py-10 text-gray-500 italic">
            Chưa có chiến dịch nào.
          </p>
        ) : (
          <div className="space-y-6">
            {campaigns.map((c) => (
              <div
                key={c.campaign_code}
                className="border border-gray-300 p-4 rounded-lg shadow hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold text-green-700 mb-1 flex justify-between items-center">
                  {c.title} {getStatusBadge(c.status)}
                </h3>
                <p className="text-gray-600 mb-2">{c.description}</p>
                <div className="flex gap-4 text-sm mb-2">
                  <div>
                    <strong>Start:</strong> {formatDate(c.start_date)}
                  </div>
                  <div>
                    <strong>End:</strong> {formatDate(c.end_date)}
                  </div>
                  <div>
                    <strong>Xe:</strong> {c.completed_vehicles}/
                    {c.total_vehicles} đã hoàn thành
                  </div>
                </div>
                <div>
                  <strong className="block mb-1">
                    Phụ tùng/Linh kiện bị ảnh hưởng:
                  </strong>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {c.affected_parts.map((p) => (
                      <li key={p}>{partMap[p]}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal tạo chiến dịch */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-4  pb-2">
              Tạo Chiến Dịch Thu Hồi
            </h2>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block mb-1 font-medium">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">
                  Mô tả <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded focus:ring-green-500 focus:border-green-500 min-h-[100px]"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">
                  Phụ tùng/Linh kiện bị ảnh hưởng{" "}
                  <span className="text-red-500">*</span>
                </label>
                {isCatalogLoading ? (
                  <p>Đang tải...</p>
                ) : catalogError ? (
                  <p className="text-red-500">Lỗi: {catalogError.message}</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-300 p-3 rounded bg-gray-50 space-y-1">
                    {catalogs.map((part) => (
                      <label
                        key={part._id}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={affectedParts.includes(part._id)}
                          onChange={() => handlePartToggle(part._id)}
                          className="h-4 w-4 text-green-600 rounded border-gray-300"
                        />
                        <span>{part.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1 font-medium">
                    Ngày Bắt Đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded"
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1 font-medium">
                    Ngày Kết Thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 flex justify-center items-center disabled:opacity-50"
              >
                {isCreating ? "Đang tạo..." : "Tạo Chiến Dịch"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManagement;
