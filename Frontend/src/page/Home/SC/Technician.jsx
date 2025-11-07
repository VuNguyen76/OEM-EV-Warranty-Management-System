import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  useGetTechnicianClaimsQuery,
  useUpdateClaimStatusMutation,
} from "../../../features/warranty/warranty.api";
import { toast } from "react-toastify";
import Loading from "../../../components/Loading.jsx";

const Technician = () => {
  const { user } = useSelector((state) => state.user);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState({
    repair_notes: "",
    parts_used: "",
    repair_cost: 0,
    completion_date: new Date().toISOString().split("T")[0],
  });

  // Query claims được gán cho kỹ thuật viên hiện tại
  const {
    data: claims = [],
    isLoading,
    refetch,
  } = useGetTechnicianClaimsQuery(user?.id);

  const [updateClaimStatus, { isLoading: isUpdating }] =
    useUpdateClaimStatusMutation();

  // Map trạng thái từ backend
  const statusMap = {
    submitted: { color: "bg-gray-500", text: "Đã gửi yêu cầu" },
    under_review: { color: "bg-yellow-500", text: "Đang xem xét" },
    approved: { color: "bg-blue-500", text: "Đã phê duyệt" },
    in_progress: { color: "bg-orange-500", text: "Đang sửa chữa" },
    rejected: { color: "bg-red-500", text: "Bị từ chối" },
    completed: { color: "bg-green-600", text: "Hoàn thành" },
  };

  // Bắt đầu sửa chữa (từ trạng thái approved → in_progress) hoặc hoàn thành (từ trạng thái in_progress → completed)
  const handleStartRepair = async (claim) => {
    try {
      await updateClaimStatus({
        code: claim.claim_code,
        data: { status: "in_progress" }, // Hoặc "in_progress" nếu bạn có thêm trạng thái này trong backend
      }).unwrap();
      toast.info("Đã bắt đầu sửa chữa");
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  const handleCompleteRepair = async (claim) => {
    try {
      await updateClaimStatus({
        code: claim.claim_code,
        data: { status: "completed" }, // Hoặc "in_progress" nếu bạn có thêm trạng thái này trong backend
      }).unwrap();
      toast.success("Đã hoàn thành sửa chữa");
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  // Gửi báo cáo hoàn thành (status = completed)
  const handleSubmitReport = async () => {
    try {
      await updateClaimStatus({
        code: selectedClaim.claim_code,
        data: {
          status: "completed",
          repair_notes: reportData.repair_notes,
          parts_used: reportData.parts_used,
          repair_cost: reportData.repair_cost,
          completion_date: reportData.completion_date,
        },
      }).unwrap();

      toast.success("Báo cáo hoàn thành thành công");
      setIsReportModalOpen(false);
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi gửi báo cáo");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center h-64">
        <Loading />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Công việc được phân công
        </h1>
        <p className="text-gray-600">
          Quản lý các yêu cầu bảo hành được giao cho bạn
        </p>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mã Claim
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Xe
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vấn đề
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {claims.map((claim) => (
              <tr key={claim._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {claim.claim_code}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {claim.vehicle?.manufacturer} {claim.vehicle?.modelYear}
                  <br />
                  <span className="text-xs text-gray-500">
                    {claim.vehicle?.vin}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate">
                    {claim.issue_description}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full text-white ${
                      statusMap[claim.status]?.color || "bg-gray-400"
                    }`}
                  >
                    {statusMap[claim.status]?.text || claim.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    {claim.status === "approved" && (
                      <button
                        onClick={() => handleStartRepair(claim)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Bắt đầu sửa
                      </button>
                    )}
                    {claim.status === "in_progress" && (
                      <button
                        onClick={() => handleCompleteRepair(claim)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Hoàn thành
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedClaim(claim)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs"
                    >
                      Chi tiết
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {claims.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Chưa có công việc nào được phân công
          </div>
        )}
      </div>

      {/* Modal báo cáo */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Báo cáo hoàn thành sửa chữa
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú sửa chữa
                </label>
                <textarea
                  value={reportData.repair_notes}
                  onChange={(e) =>
                    setReportData({
                      ...reportData,
                      repair_notes: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows="3"
                  placeholder="Mô tả công việc đã thực hiện..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Linh kiện đã sử dụng
                </label>
                <input
                  type="text"
                  value={reportData.parts_used}
                  onChange={(e) =>
                    setReportData({
                      ...reportData,
                      parts_used: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Danh sách linh kiện..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chi phí sửa chữa (VND)
                </label>
                <input
                  type="number"
                  value={reportData.repair_cost}
                  onChange={(e) =>
                    setReportData({
                      ...reportData,
                      repair_cost: Number(e.target.value),
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày hoàn thành
                </label>
                <input
                  type="date"
                  value={reportData.completion_date}
                  onChange={(e) =>
                    setReportData({
                      ...reportData,
                      completion_date: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-md"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={isUpdating}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md disabled:opacity-50"
              >
                {isUpdating ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết claim */}
      {selectedClaim && !isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Chi tiết Claim {selectedClaim.claim_code}
              </h3>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Trung tâm
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedClaim.center_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Trạng thái
                  </label>
                  <span
                    className={`px-2 py-1 text-xs rounded-full text-white ${
                      statusMap[selectedClaim.status]?.color || "bg-gray-400"
                    }`}
                  >
                    {statusMap[selectedClaim.status]?.text ||
                      selectedClaim.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mô tả vấn đề
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  {selectedClaim.issue_description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Thông tin xe
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  <p>
                    <strong>Hãng:</strong> {selectedClaim.vehicle?.manufacturer}
                  </p>
                  <p>
                    <strong>Năm SX:</strong> {selectedClaim.vehicle?.modelYear}
                  </p>
                  <p>
                    <strong>VIN:</strong> {selectedClaim.vehicle?.vin}
                  </p>
                </div>
              </div>

              {selectedClaim.repair_notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ghi chú sửa chữa
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedClaim.repair_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Technician;
