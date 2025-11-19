import React, { useState } from "react";
import {
  useGetAllClaimsQuery,
  useUpdateClaimStatusMutation,
  useApproveClaimMutation,
} from "../../../features/warranty/warranty.api.js";
import { useSelector, useDispatch } from "react-redux";
import { openModal, closeModal } from "../../../features/ui/uiSlice";
import Title from "../../../components/Title";
import Loading from "../../../components/Loading";
import Modal from "../../../components/Modal";
import Backdrop from "../../../components/Backdrop";
import { toast } from "react-toastify";
// Đã loại bỏ STATUS_INFO cũ và thay bằng logic màu sắc trong component
import { useGetAllCentersQuery } from "../../../features/center/center.api.js";

// Helper function để định nghĩa thông tin trạng thái và màu sắc
const getStatusInfo = (status) => {
  const map = {
    submitted: { label: "Đã gửi", color: "bg-blue-100 text-blue-700 border-blue-300" },
    waiting_customer: { label: "Chờ xác nhận", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    confirmed: { label: "Đã xác nhận", color: "bg-green-100 text-green-700 border-green-300" },
    rejected: { label: "Đã từ chối", color: "bg-red-100 text-red-700 border-red-300" },
    in_repair: { label: "Đang sửa", color: "bg-purple-100 text-purple-700 border-purple-300" },
    completed: { label: "Hoàn thành", color: "bg-gray-100 text-gray-700 border-gray-300" },
  };
  return map[status] || { label: status, color: "bg-gray-100 text-gray-600 border-gray-300" };
};

// Map status cho Claims Statistics (cards)
const CLAIM_STATS_CONFIG = [
  { status: "submitted", label: "Đã gửi", icon: "fa-file-lines", color: "blue" },
  { status: "waiting_customer", label: "Chờ xác nhận", icon: "fa-clock", color: "yellow" },
  { status: "confirmed", label: "Đã xác nhận", icon: "fa-circle-check", color: "green" },
  { status: "rejected", label: "Đã từ chối", icon: "fa-circle-xmark", color: "red" },
  { status: "in_repair", label: "Đang sửa", icon: "fa-wrench", color: "purple" },
  { status: "completed", label: "Hoàn thành", icon: "fa-flag-checkered", color: "gray" },
];


const ClaimsManagement = () => {
  const dispatch = useDispatch();
  const { isOpen, modalType } = useSelector((state) => state.ui.modal);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: claimsData, isLoading, refetch } = useGetAllClaimsQuery();
  const [approveClaim] = useApproveClaimMutation();

  const claims = claimsData || [];

  // Filter claims by status
  const filteredClaims = claims.filter(
    (claim) => statusFilter === "all" || claim.status === statusFilter
  );

  const handleViewDetails = (claim) => {
    setSelectedClaim(claim);
    dispatch(openModal({ modalType: "viewClaimDetails", modalData: claim }));
  };

  const handleClaim = async (claimCode) => {
    try {
      await approveClaim(claimCode).unwrap();
      toast.success("Cập nhật trạng thái thành công");
      dispatch(closeModal());
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Cập nhật trạng thái thất bại");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (isLoading)
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Loading />
      </div>
    );

  return (
    <div className="h-full w-full space-y-6 p-4 md:p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
        <Title
          title="Quản lý Claims Bảo hành"
          subTitle="Theo dõi và xử lý các yêu cầu bảo hành"
        />

        {/* Status Filter */}
        <div className="flex items-center gap-3">
          <label className="text-base font-semibold text-gray-700 whitespace-nowrap">
            Lọc theo trạng thái:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border-2 border-blue-300 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
          >
            <option value="all">Tất cả</option>
            <option value="submitted">Đã gửi</option>
            <option value="waiting_customer">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="rejected">Đã từ chối</option>
            <option value="in_repair">Đang sửa</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>
      </div>
      
      {/* Claims Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {CLAIM_STATS_CONFIG.map(({ status, label, icon, color }) => {
          const count = claims.filter(
            (claim) => claim.status === status
          ).length;
          // Tạo màu nền và màu chữ dựa trên trạng thái
          const bgColor = `bg-${color}-50`;
          const textColor = `text-${color}-600`;

          return (
            <div
              key={status}
              className={`bg-white shadow-lg hover:shadow-xl transition duration-300 rounded-xl p-4 border-l-4 border-${color}-500 ${bgColor}`}
            >
              <div className="flex justify-between items-center">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${textColor}`}>
                  {label}
                </h3>
                {/* Giữ icon nhưng sử dụng màu sắc đồng bộ */}
                <i className={`text-xl fa-solid ${icon} ${textColor}`}></i>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{count}</p>
              <p className="text-xs text-gray-500 mt-1">Tổng số claims</p>
            </div>
          );
        })}
      </div>

      {/* Claims Table */}
      <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">
            Danh sách Claims ({filteredClaims.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr className="text-left text-xs uppercase font-bold text-gray-600 tracking-wider">
                <th className="px-4 py-3">Mã Claim</th>
                <th className="px-4 py-3">VIN</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Chi phí BH</th>
                <th className="px-4 py-3 text-right">Chi phí KH</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClaims.map((claim, index) => {
                const statusInfo = getStatusInfo(claim.status);
                return (
                  <tr 
                    key={claim._id} 
                    className={index % 2 === 0 ? "bg-white hover:bg-gray-50 transition duration-100" : "bg-gray-50 hover:bg-gray-100 transition duration-100"}
                  >
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-blue-600">
                        {claim.claim_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-mono text-xs">{claim.vin}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-800">
                          {claim.vehicle?.customer_name || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {claim.vehicle?.customer_phone || ""}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full border ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className="font-semibold text-green-700">
                        {formatCurrency(
                          claim.summary?.total_warranty_amount || 0
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className="font-semibold text-orange-700">
                        {formatCurrency(
                          claim.summary?.total_customer_amount || 0
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-xs text-gray-500">
                        {new Date(claim.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetails(claim)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm transition duration-150"
                      >
                        <i className="fa-solid fa-eye mr-1"></i>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredClaims.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <i className="fa-solid fa-inbox text-4xl mb-4"></i>
              <p>Không có claim nào phù hợp với bộ lọc.</p>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      <Backdrop
        isOpen={isOpen && modalType === "viewClaimDetails"}
        onClose={() => dispatch(closeModal())}
      />

      {/* Claim Details Modal */}
      {isOpen && modalType === "viewClaimDetails" && selectedClaim && (
        <ClaimDetailsModal
          claim={selectedClaim}
          onClose={() => dispatch(closeModal())}
          onHandleClaim={handleClaim}
        />
      )}
    </div>
  );
};

// Claim Details Modal Component
const ClaimDetailsModal = ({ claim, onClose, onHandleClaim }) => {
  const { data: centers } = useGetAllCentersQuery(); // Loại bỏ isLoading và refetch không cần thiết ở đây

  const centerData = centers || [];
  const center = centerData.find((c) => c._id === claim.center_id);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num || 0);

  // Helper function để định dạng trạng thái trong Modal
  const getStatusLabel = (status) => {
    const map = {
      submitted: { text: "Đã gửi", color: "bg-blue-600 text-white" },
      confirmed: { text: "Đã xác nhận", color: "bg-green-600 text-white" },
      waiting_customer: {
        text: "Chờ xác nhận",
        color: "bg-yellow-600 text-white",
      },
      in_repair: {
        text: "Đang sửa chữa",
        color: "bg-orange-600 text-white",
      },
      rejected: { text: "Đã từ chối", color: "bg-red-600 text-white" },
      completed: { text: "Hoàn thành", color: "bg-gray-600 text-white" },
    };
    return map[status] || { text: status, color: "bg-gray-400 text-white" };
  };

  const getStatusActions = (status) => {
    // Giữ nguyên logic xử lý trạng thái
    const isCustomerPay = claim.summary?.total_customer_amount > 0;
    switch (status) {
      case "submitted":
        return isCustomerPay
          ? [
              {
                label: "Yêu cầu xác nhận bảo hành",
                color: "bg-yellow-600 hover:bg-yellow-700",
                status: "waiting_customer",
              },
              {
                label: "Từ chối yêu cầu",
                color: "bg-red-600 hover:bg-red-700",
                status: "rejected",
              },
            ]
          : [
              {
                label: "Duyệt yêu cầu",
                color: "bg-green-600 hover:bg-green-700",
                status: "confirmed",
              },
              {
                label: "Từ chối yêu cầu",
                color: "bg-red-600 hover:bg-red-700",
                status: "rejected",
              },
            ];
      case "waiting_customer":
        return [
          {
            label: "Đang chờ khách hàng xác nhận",
            color: "bg-gray-500 cursor-not-allowed",
            disabled: true,
          },
        ];
      case "confirmed":
      case "in_repair":
        return [
          {
            label: status === "confirmed" ? "Chuyển sang Đang sửa chữa (DEBUG)" : "Hoàn thành sửa chữa (DEBUG)",
            color: "bg-blue-600 hover:bg-blue-700",
            status: status === "confirmed" ? "in_repair" : "completed",
            // Lưu ý: Logic chuyển trạng thái này có thể cần API endpoint riêng, ở đây ta dùng tạm handleClaim
            // Tạm thời giữ nút debug để mô phỏng chuyển trạng thái tiếp theo.
          },
        ];
      case "rejected":
      case "completed":
        return [];
      default:
        return [];
    }
  };

  const statusInfo = getStatusLabel(claim.status);

  return (
    <Modal isOpen={true}>
      <div className="w-[95vw] max-w-5xl bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh] transform transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-3xl font-extrabold text-blue-700">
              Chi tiết yêu cầu bảo hành
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Mã:{" "}
              <span className="font-bold text-gray-700">
                {claim.claim_code}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-3xl transition duration-150"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-8 text-base text-gray-700">
          
          {/* 1️⃣ Trạng thái & Tổng quan */}
          <section className="p-5 rounded-xl shadow-lg border-2 border-blue-100 bg-white">
            <div className="flex flex-wrap justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">
                Thông tin Tổng quan
              </h3>
              <span
                className={`px-4 py-2 rounded-full font-bold shadow-md ${statusInfo.color}`}
              >
                {statusInfo.text}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <p>
                    <b>Ngày gửi:</b>{" "}
                    {new Date(claim.submitted_at).toLocaleString("vi-VN")}
                </p>
                <p>
                    <b>Trung tâm:</b>{" "}
                    <span className="font-semibold text-blue-600">{center?.name || claim?.center_id || "N/A"}</span>
                </p>
                <p>
                    <b>Người gửi (Email):</b> {center?.email || "N/A"}
                </p>
                <p>
                    <b>Mô tả sự cố:</b>{" "}
                    <span className="text-red-600 font-bold italic">
                        {claim.issue_description || "Không có mô tả"}
                    </span>
                </p>
            </div>
          </section>

          {/* 5️⃣ Tóm tắt Chi phí */}
          <section>
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Tổng chi phí
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 border-2 border-green-400 rounded-xl p-5 shadow-md">
                <h4 className="font-bold text-green-800 mb-1 uppercase text-sm">
                  Chi phí Bảo hành
                </h4>
                <p className="text-3xl font-extrabold text-green-700">
                  {formatCurrency(claim.summary?.total_warranty_amount || 0)}
                </p>
              </div>

              <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-5 shadow-md">
                <h4 className="font-bold text-orange-800 mb-1 uppercase text-sm">
                  Chi phí Khách hàng
                </h4>
                <p className="text-3xl font-extrabold text-orange-700">
                  {formatCurrency(claim.summary?.total_customer_amount || 0)}
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-5 shadow-md">
                <h4 className="font-bold text-blue-800 mb-1 uppercase text-sm">Tổng cộng</h4>
                <p className="text-3xl font-extrabold text-blue-700">
                  {formatCurrency(
                    (claim.summary?.total_customer_amount || 0) +
                      (claim.summary?.total_warranty_amount || 0)
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* 2️⃣ Vehicle Info & 3️⃣ Customer Info - Ghép thành 1 khối */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Vehicle Info */}
            <section className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 border-gray-100">
                    Thông tin xe
                </h3>
                <div className="space-y-2 text-sm">
                    <p><b>VIN:</b> <span className="font-mono text-blue-600">{claim.vehicle?.vin}</span></p>
                    <p><b>Biển số:</b> {claim.vehicle?.registration_number}</p>
                    <p><b>Hãng/Model:</b> {claim.vehicle?.manufacturer} / {claim.vehicle?.model}</p>
                    <p><b>Năm SX/Màu:</b> {claim.vehicle?.modelYear} / {claim.vehicle?.color}</p>
                    <p><b>Số km hiện tại:</b> <span className="font-bold text-purple-600">{claim.vehicle?.kilometer} km</span></p>
                    <p>
                        <b>Thời hạn BH:</b>{" "}
                        {new Date(claim.vehicle?.warranty_start).toLocaleDateString("vi-VN")}{" "}
                        →{" "}
                        {new Date(claim.vehicle?.warranty_end).toLocaleDateString("vi-VN")}
                    </p>
                </div>
            </section>

            {/* Customer Info */}
            <section className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 border-gray-100">
                    Thông tin Khách hàng
                </h3>
                <div className="space-y-2 text-sm">
                    <p><b>Họ tên:</b> <span className="font-semibold text-gray-900">{claim.vehicle?.customer_name}</span></p>
                    <p><b>SĐT:</b> <span className="font-semibold text-blue-600">{claim.vehicle?.customer_phone}</span></p>
                    <p><b>Email:</b> {claim.vehicle?.customer_email}</p>
                    <p><b>Địa chỉ:</b> {claim.vehicle?.customer_address}</p>
                </div>
            </section>

          </div>
          

          {/* 4️⃣ Parts Info */}
          <section className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 border-gray-100">
              Danh sách phụ tùng yêu cầu
            </h3>
            {claim.parts?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs uppercase font-medium text-gray-600">
                      <th className="px-4 py-3">Tên phụ tùng</th>
                      <th className="px-4 py-3">Serial</th>
                      <th className="px-4 py-3 text-center">SL</th>
                      <th className="px-4 py-3 text-center">Hợp lệ</th>
                      <th className="px-4 py-3">Loại xử lý</th>
                      <th className="px-4 py-3">Mô tả chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {claim.parts.map((p, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{p.part_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-nowrap">
                          {p.part_serial}
                        </td>
                        <td className="px-4 py-3 text-center">{p.quantity}</td>
                        <td className="px-4 py-3 text-center text-nowrap">
                          {p.is_eligible ? (
                            <span className="text-green-600 font-bold">Hợp lệ</span>
                          ) : (
                            <span className="text-red-600 font-bold">Không hợp lệ</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-nowrap">
                          {p.warranty_type === "warranty" ? (
                            <span className="text-blue-600 font-medium">Bảo hành</span>
                          ) : (
                            <span className="text-orange-600 font-medium">Khách trả phí</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] overflow-hidden whitespace-normal">
                          {p.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="italic text-gray-500">
                Không có phụ tùng nào trong yêu cầu này.
              </p>
            )}
          </section>

          {/* 6️⃣ Actions */}
          {getStatusActions(claim.status).length > 0 && (
            <section className="text-center pt-6 border-t border-gray-300">
              <div className="flex flex-wrap justify-center gap-4">
                {getStatusActions(claim.status).map((action) => (
                  <button
                    key={action.status || action.label}
                    onClick={() => {
                      if (!action.disabled) {
                        onHandleClaim(claim.claim_code);
                      }
                    }}
                    disabled={action.disabled}
                    className={`px-8 py-3 rounded-xl font-bold text-lg text-white transition-colors shadow-md ${action.color} disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ClaimsManagement;