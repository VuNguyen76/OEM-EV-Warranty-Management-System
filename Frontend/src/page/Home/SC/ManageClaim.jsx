import React, { useState } from "react";
import Title from "../../../components/Title";
import Modal from "../../../components/Modal";
import Backdrop from "../../../components/Backdrop";
import { useSelector, useDispatch } from "react-redux";
import { openModal, closeModal } from "../../../features/ui/uiSlice";
import {
  useConfirmWarrantyCostMutation,
  useGetAllClaimsQuery,
} from "../../../features/warranty/warranty.api";
import Loading from "../../../components/Loading";
import {
  useGetAllTechniciansQuery,
  useAssignTechnicianMutation,
} from "../../../features/user/user.api";
import { toast } from "react-toastify";
import STATUS_INFO from "../../../utils/statusClaim";
import { useGetAllCentersQuery } from "../../../features/center/center.api.js";

const ManageClaim = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [assignedTech, setAssignedTech] = useState("");

  const { data: apiClaims = [], isLoading } = useGetAllClaimsQuery();
  const claims = apiClaims?.data || apiClaims; // tùy response structure

  const dispatch = useDispatch();
  const { isOpen, modalType, modalData } = useSelector(
    (state) => state.ui.modal
  );

  const [assignTechnician, { isLoading: isAssigning }, refetch] =
    useAssignTechnicianMutation();

  const [confirmWarrantyCost, { isLoading: isConfirming }] =
    useConfirmWarrantyCostMutation();

  const { data: technicians, isLoading: isTechnicianLoading } =
    useGetAllTechniciansQuery();

  const handleAssign = async () => {
    if (!assignedTech) {
      toast.error("Vui lòng chọn kỹ thuật viên");
      return;
    }
    const res = await assignTechnician({
      claim_id: modalData._id,
      technician_id: assignedTech,
    }).unwrap();
    if (res.success) {
      toast.success("Phân công thành công");
      dispatch(closeModal());
      refetch();
    }
  };

  const handleViewClaim = (claim) => {
    dispatch(openModal({ modalType: "viewClaim", modalData: claim }));
  };

  const handleClaim = (claimCode) => {
    try {
      confirmWarrantyCost(claimCode).unwrap();
      toast.success("Đã gửi thông báo đến khách hàng");
      // dispatch(closeModal());
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Lỗi khi xác nhận chi phí");
    }
  };
  // Bộ lọc tìm kiếm
  const filteredClaims = (claims || []).filter((claim) => {
    const vehicle = claim.vehicle || {};
    const matchSearch =
      vehicle.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.issue_description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      claim.claim_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus =
      statusFilter === "Tất cả trạng thái" ||
      claim.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchSearch && matchStatus;
  });

  return (
    <div className="h-full w-full space-y-6 p-4">
      <Title
        title="Quản lý Claim"
        subTitle="Xem và quản lý tất cả các yêu cầu bảo hành"
      />

      {/* --- Bộ lọc --- */}
      <div className="border border-gray-300 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-lg text-gray-800">Bộ lọc</h3>
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="Tìm theo tên khách hàng, VIN, hoặc mô tả..."
            className="flex-grow border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500 w-full md:w-[220px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Tất cả trạng thái">Tất cả trạng thái</option>
            <option value="submitted">Đã gửi yêu cầu</option>
            <option value="under_review">Đang xem xét</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Bị từ chối</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>
      </div>

      {/* --- Danh sách Claim --- */}
      {isLoading ? (
        <Loading />
      ) : (
        <div className="border border-gray-300 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold text-lg text-gray-800">
            Danh sách Claim ({filteredClaims.length})
          </h3>
          <p className="text-gray-500">Tất cả claim được tạo</p>

          <div className="space-y-3">
            {filteredClaims.map((claim) => {
              const v = claim.vehicle || {};
              return (
                <div
                  key={claim._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition bg-white"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {v.customer_name || "Chưa rõ"}{" "}
                        <span className="text-gray-400 text-sm">
                          #{claim.claim_code}
                        </span>
                      </p>
                      <p className="text-gray-600 text-sm">
                        VIN: {claim.vin || "Không có"} • {v.model || "Không rõ"}
                      </p>
                      <p className="text-gray-700 mt-1">
                        {claim.issue_description || "Không có mô tả"}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Phụ tùng:{" "}
                        {claim.parts?.map((p) => p.part_name).join(", ") ||
                          "Không có"}{" "}
                        • Tổng chi phí:{" "}
                        {(claim.part_cost || 0).toLocaleString("vi-VN")} VND
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          STATUS_INFO[claim.status]?.color ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_INFO[claim.status]?.label || claim.status}
                      </span>
                      <p className="text-xs text-gray-500">
                        Tạo: {new Date(claim.createdAt).toLocaleString("vi-VN")}
                      </p>
                      <p className="text-xs text-gray-500">
                        Cập nhật:{" "}
                        {new Date(claim.updatedAt).toLocaleString("vi-VN")}
                      </p>
                      <button
                        onClick={() => handleViewClaim(claim)}
                        className="mt-2 flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md cursor-pointer"
                      >
                        <i className="fa-regular fa-eye"></i>
                        <span>Xem</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredClaims.length === 0 && (
              <p className="text-center text-gray-500 italic">
                Không tìm thấy claim nào phù hợp.
              </p>
            )}
          </div>
        </div>
      )}

      {/* --- Modal chi tiết --- */}
      {isOpen && modalType === "viewClaim" && (
        <>
          <Backdrop isOpen={isOpen} onClose={() => dispatch(closeModal())} />
          <Modal isOpen={isOpen}>
            <ClaimDetailsModal
              claim={modalData}
              onClose={() => dispatch(closeModal())}
              onHandleClaim={handleClaim}
              setAssignedTech={setAssignedTech}
              assignedTech={assignedTech}
              handleAssign={handleAssign}
              technicians={technicians}
              isAssigning={isAssigning}
            />
          </Modal>
        </>
      )}
    </div>
  );
};
const ClaimDetailsModal = ({
  claim,
  onClose,
  onHandleClaim,
  assignedTech,
  setAssignedTech,
  handleAssign,
  technicians,
  isAssigning,
}) => {
  const formatCurrency = (num) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num || 0);

  const getStatusLabel = (status) => {
    const map = {
      submitted: { text: "Đã gửi", color: "bg-blue-200 text-blue-700" },
      confirmed: { text: "Đã xác nhận", color: "bg-green-200 text-green-700" },
      waiting_customer: {
        text: "Chờ xác nhận",
        color: "bg-yellow-300 text-yellow-700",
      },
      in_repair: {
        text: "Đang sửa chữa",
        color: "bg-orange-200 text-orange-700",
      },
      rejected: { text: "Đã từ chối", color: "bg-red-200 text-red-700" },
      completed: { text: "Hoàn thành", color: "bg-gray-200 text-black-700" },
    };
    return map[status] || { text: status, color: "gray" };
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
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color} `}
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
                THBH1
              </p>
              <p>
                <b>Người gửi:</b> THBH1
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
          {claim.status === "submitted" ? (
            <div className="border border-gray-300 rounded-lg p-3 space-y-2">
              <h3 className="font-semibold text-gray-800 mb-1">
                Phụ tùng liên quan
              </h3>
              {claim.parts?.map((part, idx) => (
                <div
                  key={part._id || idx}
                  className="flex justify-between items-center border border-gray-200 rounded-lg p-2"
                >
                  <div>
                    <p>
                      {idx + 1}. {part.part_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Mã serial: {part.part_serial}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {part.cost?.toLocaleString("vi-VN")} VND
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
            </div>
          )}

          {/* 5️⃣ Cost Summary */}
          {claim.status !== "submitted" && (
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
                  <h4 className="font-semibold text-blue-800 mb-1">
                    Tổng cộng
                  </h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(
                      (claim.summary?.total_customer_amount || 0) +
                        (claim.summary?.total_warranty_amount || 0)
                    )}
                  </p>
                </div>
              </div>
            </section>
          )}
          {/* Technician assign */}
          {claim.status === "confirmed" && (
            <div className="border border-gray-300 rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2">
                Phân công kỹ thuật viên
              </h3>
              <div className="flex gap-2">
                <select
                  className="flex-grow border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                  value={assignedTech}
                  onChange={(e) => setAssignedTech(e.target.value)}
                >
                  <option value="">-- Chọn kỹ thuật viên --</option>
                  {technicians.map((tech) => (
                    <option key={tech.name} value={tech._id}>
                      {`${tech.name} - ${tech.email} (Workload: ${tech.totalClaims})`}
                    </option>
                  ))}
                </select>
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1"
                  onClick={handleAssign}
                  disabled={isAssigning}
                >
                  <i className="fa-solid fa-user-gear"></i> Phân công
                </button>
              </div>
            </div>
          )}
          {/* 6️⃣ Actions - thêm debug */}
          {claim.status === "waiting_customer" && (
            <section className="text-center pt-4 border-t border-gray-300">
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  key="notify_customer"
                  onClick={() => {
                    onHandleClaim(claim.claim_code);
                  }}
                  className={`px-5 py-2 rounded-lg font-medium text-white transition-colors bg-yellow-300 hover:bg-yellow-500`}
                >
                  <i className="fa-solid fa-paper-plane"></i>
                  <span> Gửi thông báo đến khách hàng</span>
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ManageClaim;
