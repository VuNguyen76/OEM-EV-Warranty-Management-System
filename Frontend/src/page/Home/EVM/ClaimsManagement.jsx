import React, { useState, useEffect } from "react";
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
import STATUS_INFO from "../../../utils/statusClaim";
import { useGetAllCentersQuery } from "../../../features/center/center.api.js";

const ClaimsManagement = () => {
  const dispatch = useDispatch();
  const { isOpen, modalType, modalData } = useSelector(
    (state) => state.ui.modal
  );
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
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Cập nhật trạng thái thất bại");
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
    <div className="h-full w-full space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Title
          title="Quản lý Claims"
          subTitle="Theo dõi và xử lý các yêu cầu bảo hành"
        />

        {/* Status Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            Lọc theo trạng thái:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả</option>
            <option value="submitted">Đã gửi</option>
            <option value="waiting_customer">Chờ xác nhận </option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="rejected">Đã từ chối</option>
            <option value="in_repair">Đang sửa</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>
      </div>

      {/* Claims Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          {
            status: "submitted",
            label: "Đã gửi",
            icon: "fa-file-lines",
            color: "blue",
          },
          {
            status: "waiting_customer",
            label: "Yêu cầu xác nhận bảo hành",
            icon: "fa-clock",
            color: "orange",
          },
          {
            status: "confirmed",
            label: "Đã xác nhận",
            icon: "fa-check-circle",
            color: "green",
          },
          {
            status: "rejected",
            label: "Đã từ chối",
            icon: "fa-times-circle",
            color: "red",
          },
          {
            status: "in_repair",
            label: "Đang sửa",
            icon: "fa-wrench",
            color: "purple",
          },
          {
            status: "completed",
            label: "Hoàn thành",
            icon: "fa-flag-checkered",
            color: "gray",
          },
        ].map(({ status, label, icon, color }) => {
          const count = claims.filter(
            (claim) => claim.status === status
          ).length;
          return (
            <div
              key={status}
              className="bg-white shadow rounded-lg p-4 border border-gray-300"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold mb-2">{label}</h3>
                <i className={`text-${color}-500 fa-solid ${icon}`}></i>
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Claims Table */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-300">
          <h3 className="text-lg font-semibold text-gray-800">
            Danh sách Claims ({filteredClaims.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm font-medium text-gray-700">
                <th className="px-4 py-3">Mã Claim</th>
                <th className="px-4 py-3">VIN</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Chi phí BH</th>
                <th className="px-4 py-3">Chi phí KH</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClaims.map((claim) => (
                <tr key={claim._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-blue-600">
                      {claim.claim_code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">{claim.vin}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {claim.vehicle?.customer_name || "N/A"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {claim.vehicle?.customer_phone || ""}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        STATUS_INFO[claim.status]?.color ||
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_INFO[claim.status]?.label || claim.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-green-600">
                      {formatCurrency(
                        claim.summary?.total_warranty_amount || 0
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-orange-600">
                      {formatCurrency(
                        claim.summary?.total_customer_amount || 0
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {new Date(claim.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleViewDetails(claim)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      <i className="fa-solid fa-eye mr-1"></i>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredClaims.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <i className="fa-solid fa-inbox text-4xl mb-4"></i>
              <p>Không có claim nào phù hợp với bộ lọc</p>
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
  const { data: centers, isLoading, refetch } = useGetAllCentersQuery();

  const centerData = centers || [];
  const center = centerData.find((c) => c._id === claim.center_id);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num || 0);

  const getStatusLabel = (status) => {
    const map = {
      submitted: { text: "Đã gửi", color: "blue" },
      confirmed: { text: "Đã xác nhận", color: "green" },
      in_repair: { text: "Đang sửa chữa", color: "purple" },
      rejected: { text: "Đã từ chối", color: "red" },
      completed: { text: "Hoàn thành", color: "gray" },
    };
    return map[status] || { text: status, color: "gray" };
  };

  const getStatusActions = (status) => {
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
            ]
          : [
              {
                label: "Duyệt yêu cầu",
                color: "bg-green-600 hover:bg-green-700",
                status: "confirmed",
              },
            ];
      case "waiting_customer":
        return [
          {
            label: "Xác nhận",
            color: "bg-green-600 hover:bg-green-700",
            status: "confirmed",
          },
          {
            label: "Từ chối",
            color: "bg-red-600 hover:bg-red-700",
            status: "rejected",
          },
        ];
      case "confirmed":
        return [
          {
            label: "Bắt đầu sửa chữa",
            color: "bg-blue-600 hover:bg-blue-700",
            status: "in_repair",
          },
          {
            label: "Từ chối",
            color: "bg-red-600 hover:bg-red-700",
            status: "rejected",
          },
        ];
      case "in_repair":
        return [
          {
            label: "Hoàn thành bảo hành",
            color: "bg-green-600 hover:bg-green-700",
            status: "completed",
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
      <div className="w-[90vw] max-w-5xl bg-white rounded-xl shadow-xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Chi tiết yêu cầu bảo hành
            </h2>
            <p className="text-gray-500 text-sm">
              Mã:{" "}
              <span className="font-semibold text-gray-700">
                {claim.claim_code}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 text-sm text-gray-700">
          {/* 1️⃣ Claim Info */}
          <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">
                Thông tin yêu cầu bảo hành
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}
              >
                {statusInfo.text}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p>
                <b>Ngày gửi:</b>{" "}
                {new Date(claim.submitted_at).toLocaleString("vi-VN")}
              </p>
              <p>
                <b>Trung tâm bảo hành:</b>{" "}
                {center?.name || claim?.center_id || "N/A"}
              </p>
              <p>
                <b>Người gửi:</b> {center?.email || "N/A"}
              </p>
              <p>
                <b>Mô tả sự cố:</b>{" "}
                <span className="text-red-500 font-bold">
                  {claim.issue_description || "Không có mô tả"}
                </span>
              </p>
            </div>
          </section>

          {/* 2️⃣ Vehicle Info */}
          <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Thông tin xe
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p>
                <b>VIN:</b> {claim.vehicle?.vin}
              </p>
              <p>
                <b>Biển số:</b> {claim.vehicle?.registration_number}
              </p>
              <p>
                <b>Hãng:</b> {claim.vehicle?.manufacturer}
              </p>
              <p>
                <b>Model:</b> {claim.vehicle?.model}
              </p>
              <p>
                <b>Năm SX:</b> {claim.vehicle?.modelYear}
              </p>
              <p>
                <b>Màu:</b> {claim.vehicle?.color}
              </p>
              <p>
                <b>Số km:</b> {claim.vehicle?.kilometer} km
              </p>
              <p>
                <b>Bảo hành:</b>{" "}
                {new Date(claim.vehicle?.warranty_start).toLocaleDateString(
                  "vi-VN"
                )}{" "}
                →{" "}
                {new Date(claim.vehicle?.warranty_end).toLocaleDateString(
                  "vi-VN"
                )}
              </p>
            </div>
          </section>

          {/* 3️⃣ Customer Info */}
          <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Thông tin khách hàng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p>
                <b>Họ tên:</b> {claim.vehicle?.customer_name}
              </p>
              <p>
                <b>SĐT:</b> {claim.vehicle?.customer_phone}
              </p>
              <p>
                <b>Email:</b> {claim.vehicle?.customer_email}
              </p>
              <p>
                <b>Địa chỉ:</b> {claim.vehicle?.customer_address}
              </p>
            </div>
          </section>

          {/* 4️⃣ Parts Info */}
          <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Danh sách phụ tùng yêu cầu bảo hành
            </h3>
            {claim.parts?.length > 0 ? (
              <table className="w-full border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr className="text-left">
                    <th className="px-4 py-2">Tên phụ tùng</th>
                    <th className="px-4 py-2">Serial</th>
                    <th className="px-4 py-2">Số lượng</th>
                    <th className="px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2">Loại xử lý</th>
                    <th className="px-4 py-2">Mô tả chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {claim.parts.map((p, i) => (
                    <tr
                      key={i}
                      className="border-t border-gray-300 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2">{p.part_name}</td>
                      <td className="px-4 py-2 font-mono text-nowrap">
                        {p.part_serial}
                      </td>
                      <td className="px-4 py-2">{p.quantity}</td>
                      <td className="px-4 py-2 text-nowrap">
                        {p.is_eligible ? (
                          <span className="text-green-600 font-medium">
                            Hợp lệ
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium">
                            Không hợp lệ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-nowrap">
                        {p.warranty_type === "warranty" ? (
                          <span className="text-green-600 font-medium">
                            Bảo hành
                          </span>
                        ) : (
                          <span className="text-orange-600 font-medium">
                            Khách trả phí
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">
                        {p.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="italic text-gray-500">
                Không có phụ tùng nào trong yêu cầu này
              </p>
            )}
          </section>

          {/* 5️⃣ Cost Summary */}
          <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Tổng chi phí bảo hành
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-semibold text-green-800 mb-1">
                  Chi phí trung tâm trả
                </h4>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(claim.summary?.total_warranty_amount || 0)}
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h4 className="font-semibold text-orange-800 mb-1">
                  Chi phí khách hàng trả
                </h4>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(claim.summary?.total_customer_amount || 0)}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-800 mb-1">Tổng cộng</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    (claim.summary?.total_customer_amount || 0) +
                      (claim.summary?.total_warranty_amount || 0)
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* 6️⃣ Actions - thêm debug */}
          {getStatusActions(claim.status).length > 0 && (
            <section className="text-center pt-4 border-t border-gray-300">
              <div className="flex flex-wrap justify-center gap-4">
                {getStatusActions(claim.status).map((action) => (
                  <button
                    key={action.status}
                    onClick={() => {
                      onHandleClaim(claim.claim_code);
                    }}
                    className={`px-5 py-2 rounded-lg font-medium text-white transition-colors ${action.color}`}
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
